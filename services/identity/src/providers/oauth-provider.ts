/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Portions Copyright (c) Better Auth authors.
 * Licensed under the MIT License.
 *
 * File: services/identity/src/providers/oauth-provider.ts
 * Purpose: Base interface and adapter contracts for pluggable OAuth 2.0 providers
 */

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number | null;
  tokenType?: string;
  scopesGranted: string[];
}

export interface OAuthUserProfile {
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl?: string | null;
}

export interface IOAuthProvider {
  readonly providerName: string;
  getAuthorizationUrl(state: string, redirectUri: string, extraScopes?: string[]): string;
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens>;
  getUserProfile(tokens: OAuthTokens): Promise<OAuthUserProfile>;
}
