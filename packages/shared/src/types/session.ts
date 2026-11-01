/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/shared/src/types/session.ts
 * Purpose: Domain types for sessions, JWT tokens, and SSO products
 */

export interface Session {
  id: string;
  userId: string;
  refreshTokenHash: string;
  deviceId: string | null;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  revoked: boolean;
}

export interface SessionTokenPayload {
  iss: string;
  sub: string;
  aud: string[];
  exp: number;
  iat: number;
  scope: string;
  device_id: string | null;
  session_id: string;
  ttl_reason?: string;
  ttl_computed_min?: number;
  requires_reauth_for?: string[];
}

export interface ProductTokenPayload {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  brain_id?: string | null;
  scope: string;
  session_id: string;
}

export interface JwksKey {
  kid: string;
  kty: string;
  publicKeyPem: string;
  privateKeyEncrypted: string;
  status: 'active' | 'retired' | 'expired';
  rotatedAt: Date;
  expiresAt: Date | null;
}

export interface ProductRegistration {
  productId: string;
  productName: string;
  webhookUrl: string | null;
  allowedScopes: string[];
  createdAt: Date;
  active: boolean;
}
