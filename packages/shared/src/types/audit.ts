/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/shared/src/types/audit.ts
 * Purpose: Domain types for tamper-proof audit logging
 */

export type AuditEventType =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'token_refresh'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'oauth_linked'
  | 'oauth_unlinked'
  | 'consent_granted'
  | 'consent_revoked'
  | 'profile_updated'
  | 'session_revoked';

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  event: AuditEventType;
  metadata: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
}
