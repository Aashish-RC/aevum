/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Portions Copyright (c) Better Auth authors.
 * Licensed under the MIT License.
 *
 * File: services/identity/src/providers/google-provider.ts
 * Purpose: Google OAuth 2.0 provider implementation with drive.file scope support
 */

import { AuthenticationError } from '@aevum/shared';
import type { IOAuthProvider, OAuthTokens, OAuthUserProfile } from './oauth-provider.js';

export interface GoogleProviderOptions {
  clientId: string;
  clientSecret: string;
  scopes?: string[];
  fetchFn?: typeof fetch;
}

export class GoogleOAuthProvider implements IOAuthProvider {
  public readonly providerName = 'google';
  private clientId: string;
  private clientSecret: string;
  private defaultScopes: string[];
  private fetch: typeof fetch;

  constructor(options: GoogleProviderOptions) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.defaultScopes = options.scopes || [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/drive.file',
    ];
    this.fetch = options.fetchFn || globalThis.fetch;
  }

  public getAuthorizationUrl(
    state: string,
    redirectUri: string,
    extraScopes: string[] = [],
  ): string {
    const scopes = Array.from(new Set([...this.defaultScopes, ...extraScopes])).join(' ');
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scopes);
    url.searchParams.set('state', state);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    return url.toString();
  }

  public async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await this.fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new AuthenticationError(
        `Google token exchange failed: ${errText}`,
        'OAUTH_PROVIDER_ERROR',
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
    };

    const grantedScopes = (data.scope || '').split(' ').map((s) => {
      // Normalize Google drive.file scope alias
      if (s === 'https://www.googleapis.com/auth/drive.file') return 'drive.file';
      return s;
    });

    if (!grantedScopes.includes('drive.file') && data.scope?.includes('drive.file')) {
      grantedScopes.push('drive.file');
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      expiresIn: data.expires_in || 3600,
      tokenType: data.token_type || 'Bearer',
      scopesGranted: grantedScopes,
    };
  }

  public async getUserProfile(tokens: OAuthTokens): Promise<OAuthUserProfile> {
    const response = await this.fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });

    if (!response.ok) {
      throw new AuthenticationError('Failed to fetch Google user profile', 'OAUTH_PROVIDER_ERROR');
    }

    const data = (await response.json()) as {
      sub: string;
      email: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    return {
      providerUserId: data.sub,
      email: data.email.toLowerCase(),
      emailVerified: Boolean(data.email_verified),
      displayName: data.name || data.email.split('@')[0] || 'Google User',
      avatarUrl: data.picture || null,
    };
  }
}
