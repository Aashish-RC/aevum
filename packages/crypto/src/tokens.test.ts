/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/crypto/src/tokens.test.ts
 * Purpose: Unit tests for session tokens, JWT signing, and refresh token hashing
 */

import { describe, expect, it } from 'vitest';
import {
  createSessionJwt,
  generateRefreshToken,
  hashRefreshToken,
  verifySessionJwt,
} from './tokens.js';

describe('Tokens & Sessions', () => {
  const secretKey = 'super-secret-jwt-key-minimum-32-chars-long!';

  it('generates unique refresh tokens and produces deterministic hashes', () => {
    const token1 = generateRefreshToken();
    const token2 = generateRefreshToken();

    expect(token1).not.toBe(token2);
    expect(hashRefreshToken(token1)).toBe(hashRefreshToken(token1));
    expect(hashRefreshToken(token1)).not.toBe(hashRefreshToken(token2));
  });

  it('signs and verifies a session JWT', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = await createSessionJwt(
      {
        sub: 'usr_12345',
        aud: ['aevum'],
        exp,
        scope: 'core:read core:write',
        device_id: 'dev_123',
        session_id: 'ses_123',
      },
      secretKey,
    );

    const verified = await verifySessionJwt(token, secretKey);
    expect(verified.sub).toBe('usr_12345');
    expect(verified.session_id).toBe('ses_123');
    expect(verified.device_id).toBe('dev_123');
    expect(verified.iss).toBe('aevum');
  });

  it('rejects an invalid session JWT', async () => {
    await expect(verifySessionJwt('invalid.token.here', secretKey)).rejects.toThrow();
  });
});
