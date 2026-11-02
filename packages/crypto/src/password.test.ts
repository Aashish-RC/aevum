/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/crypto/src/password.test.ts
 * Purpose: Unit tests for scrypt password hashing and verification
 */

import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('Password Hashing', () => {
  it('hashes and successfully verifies a correct password', async () => {
    const pw = 'SecurePassword123!@#';
    const hash = await hashPassword(pw);

    expect(hash).toContain(':');
    expect(hash).not.toBe(pw);

    const isValid = await verifyPassword(pw, hash);
    expect(isValid).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const pw = 'SecurePassword123!@#';
    const hash = await hashPassword(pw);

    const isValid = await verifyPassword('WrongPassword123!@#', hash);
    expect(isValid).toBe(false);
  });
});
