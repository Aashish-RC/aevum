/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/shared/src/types/api-key.ts
 * Purpose: Domain types for user and Brain-scoped API keys
 */

export interface ApiKey {
  id: string;
  userId: string;
  brainId: string | null;
  keyHash: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revoked: boolean;
}
