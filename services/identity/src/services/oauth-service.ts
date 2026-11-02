/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Portions Copyright (c) Better Auth authors.
 * Licensed under the MIT License.
 *
 * File: services/identity/src/services/oauth-service.ts
 * Purpose: OAuth authorization flow, provider token exchange, vault encryption, and consent tracking
 */

import { randomBytes } from 'node:crypto';
import {
  createSessionJwt,
  encryptWithDek,
  generateDek,
  generateRefreshToken,
  hashRefreshToken,
  unwrapDek,
  wrapDek,
} from '@aevum/crypto';
import { db as defaultDb } from '@aevum/db';
import { AuthorizationError, NotFoundError, config } from '@aevum/shared';
import { AppleOAuthProvider } from '../providers/apple-provider.js';
import { GoogleOAuthProvider } from '../providers/google-provider.js';
import type { IOAuthProvider } from '../providers/oauth-provider.js';
import { DrizzleAuthRepository, type IAuthRepository, type UserSelect } from './auth-repository.js';
import type { AuthSessionResult, SafeUser } from './auth-service.js';

export interface OAuthCallbackInput {
  code: string;
  redirectUri: string;
  deviceId?: string | null;
  userAgent?: string | null;
  ip?: string | null;
}

export class OAuthService {
  private repo: IAuthRepository;
  private providers: Map<string, IOAuthProvider> = new Map();
  private masterKek: string;
  private jwtSecret: string;

  constructor(options?: {
    repo?: IAuthRepository;
    providers?: IOAuthProvider[];
    masterKek?: string;
    jwtSecret?: string;
  }) {
    this.repo = options?.repo || new DrizzleAuthRepository(defaultDb);
    this.masterKek = options?.masterKek || config.AEVUM_MASTER_KEK;
    this.jwtSecret = options?.jwtSecret || config.AEVUM_JWT_SECRET;

    if (options?.providers && options.providers.length > 0) {
      for (const p of options.providers) {
        this.providers.set(p.providerName, p);
      }
    } else {
      // Register standard v1 OAuth providers
      this.registerProvider(
        new GoogleOAuthProvider({
          clientId: config.GOOGLE_CLIENT_ID,
          clientSecret: config.GOOGLE_CLIENT_SECRET,
        }),
      );
      this.registerProvider(
        new AppleOAuthProvider({
          clientId: config.APPLE_CLIENT_ID,
          clientSecret: config.APPLE_CLIENT_SECRET,
        }),
      );
    }
  }

  public registerProvider(provider: IOAuthProvider): void {
    this.providers.set(provider.providerName, provider);
  }

  public getProvider(providerName: string): IOAuthProvider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new NotFoundError(
        `OAuth provider '${providerName}' is not configured or unsupported`,
        'OAUTH_PROVIDER_NOT_FOUND',
      );
    }
    return provider;
  }

  /**
   * Generates authorization URL with state parameter.
   */
  public getAuthorizationUrl(
    providerName: string,
    redirectUri: string,
    extraScopes?: string[],
  ): { url: string; state: string } {
    const provider = this.getProvider(providerName);
    const state = randomBytes(24).toString('hex');
    const url = provider.getAuthorizationUrl(state, redirectUri, extraScopes);
    return { url, state };
  }

  /**
   * Handles OAuth callback: exchanges code for tokens, extracts user profile,
   * creates/links user, encrypts tokens with user DEK, records consent, and issues session (T13.4, T13.5).
   */
  public async handleCallback(
    providerName: string,
    input: OAuthCallbackInput,
  ): Promise<AuthSessionResult> {
    const provider = this.getProvider(providerName);

    // 1. Exchange authorization code for tokens
    const tokens = await provider.exchangeCode(input.code, input.redirectUri);

    // 2. Fetch provider profile
    const profile = await provider.getUserProfile(tokens);

    // 3. Find or create user
    const existingLink = await this.repo.findOAuthLink(providerName, profile.providerUserId);
    let targetUser: UserSelect | null = null;

    if (existingLink) {
      targetUser = await this.repo.findUserById(existingLink.userId);
    }

    if (!targetUser) {
      // Check if user with this email exists
      const existingUserByEmail = await this.repo.findUserByEmail(profile.email);
      if (existingUserByEmail) {
        targetUser = existingUserByEmail;
      } else {
        // Create new user (OAuth users have null passwordHash)
        const dek = generateDek();
        const wrappedDek = wrapDek(dek, this.masterKek);
        const now = new Date();

        targetUser = await this.repo.createUser({
          email: profile.email,
          displayName: profile.displayName,
          passwordHash: null,
          avatarUrl: profile.avatarUrl || null,
          emailVerified: profile.emailVerified,
          locale: 'en',
          timezone: 'UTC',
          dekWrapped: wrappedDek,
          dekVersion: 1,
          dekCreatedAt: now,
          status: 'active',
          lastLoginAt: now,
        });
      }
    }

    if (targetUser.status === 'suspended') {
      throw new AuthorizationError('Account is suspended', 'ACCOUNT_SUSPENDED');
    }

    // 4. Ensure per-user DEK exists and unwrap it
    let dek: Buffer;
    if (!targetUser.dekWrapped) {
      dek = generateDek();
      const wrappedDek = wrapDek(dek, this.masterKek);
      await this.repo.updateUserDek(targetUser.id, wrappedDek);
    } else {
      dek = unwrapDek(targetUser.dekWrapped, this.masterKek);
    }

    // 5. Encrypt provider tokens using user DEK
    const accessTokenEncrypted = encryptWithDek(tokens.accessToken, dek);
    const refreshTokenEncrypted = tokens.refreshToken
      ? encryptWithDek(tokens.refreshToken, dek)
      : null;

    const tokenExpiresAt = tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null;

    // 6. Save or update OAuth link row
    await this.repo.saveOAuthLink({
      userId: targetUser.id,
      provider: providerName,
      providerUserId: profile.providerUserId,
      accessTokenEncrypted,
      refreshTokenEncrypted,
      tokenExpiresAt,
      scopesGranted: tokens.scopesGranted,
      scopesRequested: tokens.scopesGranted,
    });

    // 7. Record granted consents in Consent Ledger
    for (const scope of tokens.scopesGranted) {
      await this.repo.recordConsent({
        userId: targetUser.id,
        provider: providerName,
        scope,
        status: 'granted',
      });
    }

    // 8. Log audit entry
    await this.repo.createAuditLog({
      userId: targetUser.id,
      event: 'oauth_linked',
      metadata: {
        provider: providerName,
        providerUserId: profile.providerUserId,
        scopes: tokens.scopesGranted,
      },
      ip: input.ip || null,
      userAgent: input.userAgent || null,
    });

    // 9. Issue session for user
    const sessionResult = await this.createSession({
      userId: targetUser.id,
      deviceId: input.deviceId,
      userAgent: input.userAgent,
      ip: input.ip,
    });

    return {
      user: this.toSafeUser(targetUser),
      ...sessionResult,
    };
  }

  /**
   * Revokes a linked provider, marking consents as revoked (T13.9).
   */
  public async revokeProviderLink(userId: string, providerName: string): Promise<void> {
    const existing = await this.repo.findOAuthLinkByUserAndProvider(userId, providerName);
    if (!existing) {
      throw new NotFoundError(
        `OAuth link for provider '${providerName}' not found`,
        'OAUTH_LINK_NOT_FOUND',
      );
    }

    await this.repo.deleteOAuthLink(userId, providerName);
    await this.repo.revokeConsent(userId, providerName, 'User revoked provider link');

    await this.repo.createAuditLog({
      userId,
      event: 'oauth_unlinked',
      metadata: { provider: providerName },
      ip: null,
      userAgent: null,
    });
  }

  /**
   * Retrieves granted scopes for a user and provider.
   */
  public async getGrantedScopes(userId: string, providerName: string): Promise<string[]> {
    const consents = await this.repo.findConsents(userId, providerName);
    return consents.filter((c) => c.status === 'granted').map((c) => c.scope);
  }

  private async createSession(params: {
    userId: string;
    deviceId?: string | null;
    userAgent?: string | null;
    ip?: string | null;
  }): Promise<{ sessionToken: string; refreshToken: string; sessionId: string; expiresAt: Date }> {
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const createdSession = await this.repo.createSession({
      userId: params.userId,
      refreshTokenHash,
      deviceId: params.deviceId || null,
      userAgent: params.userAgent || null,
      ip: params.ip || null,
      expiresAt,
      revoked: false,
    });

    const jwtExp = Math.floor(now.getTime() / 1000) + 60 * 60;

    const sessionToken = await createSessionJwt(
      {
        sub: params.userId,
        aud: ['aevum'],
        exp: jwtExp,
        scope: 'core:read core:write',
        device_id: params.deviceId || null,
        session_id: createdSession.id,
        ttl_reason: 'oauth_login',
        ttl_computed_min: 60,
      },
      this.jwtSecret,
    );

    return {
      sessionToken,
      refreshToken,
      sessionId: createdSession.id,
      expiresAt,
    };
  }

  private toSafeUser(raw: UserSelect): SafeUser {
    return {
      id: raw.id,
      email: raw.email,
      displayName: raw.displayName,
      emailVerified: raw.emailVerified,
      avatarUrl: raw.avatarUrl,
      locale: raw.locale,
      timezone: raw.timezone,
      createdAt: raw.createdAt,
      lastLoginAt: raw.lastLoginAt,
      status: raw.status,
    };
  }
}
