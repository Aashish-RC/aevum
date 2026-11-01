/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/shared/src/types/user.ts
 * Purpose: Domain types for users and OAuth links
 */

export type UserStatus = 'active' | 'suspended' | 'deleted';

export type OAuthProvider = 'google' | 'apple' | 'github' | 'gitlab' | 'microsoft';

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  passwordHash: string | null;
  displayName: string;
  avatarUrl: string | null;
  locale: string;
  timezone: string;
  dekWrapped: Buffer | null;
  dekVersion: number;
  dekCreatedAt: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  status: UserStatus;
}

export interface OAuthLink {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  accessTokenEncrypted: string | null;
  refreshTokenEncrypted: string | null;
  tokenExpiresAt: Date | null;
  scopesGranted: string[];
  scopesRequested: string[];
  linkedAt: Date;
  lastRefreshedAt: Date | null;
}
