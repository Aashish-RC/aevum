/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/shared/src/types/consent.ts
 * Purpose: Domain types for the provider consent ledger
 */

export type ConsentStatus = 'granted' | 'revoked';

export interface ConsentRecord {
  id: string;
  userId: string;
  provider: string;
  scope: string;
  status: ConsentStatus;
  grantedAt: Date;
  revokedAt: Date | null;
  reason: string | null;
}
