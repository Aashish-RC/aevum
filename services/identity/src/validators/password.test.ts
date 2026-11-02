/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: services/identity/src/validators/password.test.ts
 * Purpose: Unit tests for password validation logic and breach detection
 */

import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validatePassword, validatePasswordLogic } from './password.js';

describe('Password Policy Validator', () => {
  const user = { email: 'alice@example.com', display_name: 'Alice Cooper' };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // T13.17
  it('T13.17: accepts valid password with 15 chars (3/3/3/3)', () => {
    const result = validatePasswordLogic('Abcdef123!@#XYZ', user);
    expect(result.ok).toBe(true);
  });

  // T13.18
  it('T13.18: rejects password under 12 characters with LENGTH', () => {
    const result = validatePasswordLogic('short1A!', user);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('LENGTH');
    }
  });

  // T13.19
  it('T13.19: rejects password over 21 characters with LENGTH', () => {
    const result = validatePasswordLogic('Abcdef123!@#XyZ12345678', user);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('LENGTH');
    }
  });

  // T13.20
  it('T13.20: rejects password missing upper/digit/special characters', () => {
    const result = validatePasswordLogic('abcdefghijkl', user);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('UPPERCASE');
    }
  });

  // T13.21
  it('T13.21: rejects 4+ repeating consecutive characters with REPEAT', () => {
    const result = validatePasswordLogic('AAAAaaaa1111!!!', user);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('REPEAT');
    }
  });

  // T13.22
  it('T13.22: rejects password containing user email local-part with EMAIL_IN_PW', () => {
    const result = validatePasswordLogic('alice123!@#ABC', user);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('EMAIL_IN_PW');
    }
  });

  // T13.24
  it('T13.24: accepts password with space as special character', () => {
    const result = validatePasswordLogic('ABC def 123 !@#', user);
    expect(result.ok).toBe(true);
  });

  // T13.23
  it('T13.23: rejects password found in HIBP with BREACHED', async () => {
    const pw = 'Abcdef123!@#XYZ';
    const sha1 = createHash('sha1').update(pw).digest('hex').toUpperCase();
    const suffix = sha1.substring(5);

    const mockFetch = vi.fn().mockResolvedValue({
      text: async () => `${suffix}:42\nFEEDBEEF:1\n`,
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await validatePassword(pw, user, { checkBreach: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('BREACHED');
      expect(result.message).toContain('breach');
    }
  });
});
