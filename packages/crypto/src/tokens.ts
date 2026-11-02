/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/crypto/src/tokens.ts
 * Purpose: Session and product token generation, signing, and verification
 */

import { createHash, randomBytes } from 'node:crypto';
import type { SessionTokenPayload } from '@aevum/shared';
import { AuthenticationError } from '@aevum/shared';
import { SignJWT, jwtVerify } from 'jose';

export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashRefreshToken(refreshToken: string): string {
  return createHash('sha256').update(refreshToken).digest('hex');
}

export async function createSessionJwt(
  payload: Omit<SessionTokenPayload, 'iss' | 'iat'>,
  secretKey: string,
): Promise<string> {
  const secret = new TextEncoder().encode(secretKey);

  return new SignJWT({
    aud: payload.aud,
    scope: payload.scope,
    device_id: payload.device_id,
    session_id: payload.session_id,
    ttl_reason: payload.ttl_reason,
    ttl_computed_min: payload.ttl_computed_min,
    requires_reauth_for: payload.requires_reauth_for,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('aevum')
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(payload.exp)
    .sign(secret);
}

export async function verifySessionJwt(
  token: string,
  secretKey: string,
): Promise<SessionTokenPayload> {
  try {
    const secret = new TextEncoder().encode(secretKey);
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'aevum',
    });

    return {
      iss: String(payload.iss),
      sub: String(payload.sub),
      aud: Array.isArray(payload.aud) ? (payload.aud as string[]) : [String(payload.aud)],
      exp: Number(payload.exp),
      iat: Number(payload.iat),
      scope: String(payload.scope || ''),
      device_id: payload.device_id ? String(payload.device_id) : null,
      session_id: String(payload.session_id || ''),
      ttl_reason: payload.ttl_reason ? String(payload.ttl_reason) : undefined,
      ttl_computed_min: payload.ttl_computed_min ? Number(payload.ttl_computed_min) : undefined,
      requires_reauth_for: Array.isArray(payload.requires_reauth_for)
        ? (payload.requires_reauth_for as string[])
        : undefined,
    };
  } catch (err) {
    throw new AuthenticationError(
      `Invalid session token: ${err instanceof Error ? err.message : 'Unknown error'}`,
      'INVALID_TOKEN',
    );
  }
}
