/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/crypto/src/envelope.test.ts
 * Purpose: Unit tests for AES-256-GCM envelope encryption and KEK rotation
 */

import { describe, expect, it } from 'vitest';
import {
  decryptWithDek,
  encryptWithDek,
  generateDek,
  rotateMasterKek,
  unwrapDek,
  wrapDek,
} from './envelope.js';

describe('Envelope Encryption', () => {
  const kekHex1 = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const kekHex2 = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

  it('generates a 32-byte DEK', () => {
    const dek = generateDek();
    expect(dek.length).toBe(32);
  });

  it('wraps and unwraps a DEK with a 256-bit KEK', () => {
    const dek = generateDek();
    const wrapped = wrapDek(dek, kekHex1);
    const unwrapped = unwrapDek(wrapped, kekHex1);
    expect(unwrapped.equals(dek)).toBe(true);
  });

  it('encrypts and decrypts OAuth token payloads with a DEK', () => {
    const dek = generateDek();
    const token = 'ya29.a0AfH6SMD...sample_oauth_token';
    const ciphertext = encryptWithDek(token, dek);
    expect(ciphertext).not.toBe(token);

    const decrypted = decryptWithDek(ciphertext, dek);
    expect(decrypted).toBe(token);
  });

  it('rotates master KEK without invalidating token decryptability', () => {
    const dek = generateDek();
    const token = 'refresh_token_secret_value';
    const ciphertext = encryptWithDek(token, dek);

    const wrappedDek1 = wrapDek(dek, kekHex1);
    const wrappedDek2 = rotateMasterKek(wrappedDek1, kekHex1, kekHex2);

    const reUnwrappedDek = unwrapDek(wrappedDek2, kekHex2);
    expect(reUnwrappedDek.equals(dek)).toBe(true);

    const decrypted = decryptWithDek(ciphertext, reUnwrappedDek);
    expect(decrypted).toBe(token);
  });
});
