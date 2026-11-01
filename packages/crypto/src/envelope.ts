/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/crypto/src/envelope.ts
 * Purpose: Envelope encryption primitives for OAuth token vault and per-user DEKs
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { SecurityError } from '@aevum/shared';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Generates a random 256-bit Data Encryption Key (DEK).
 */
export function generateDek(): Buffer {
  return randomBytes(KEY_LENGTH);
}

function parseKek(kekHex: string): Buffer {
  const kek = Buffer.from(kekHex, 'hex');
  if (kek.length !== KEY_LENGTH) {
    throw new SecurityError(`Invalid master KEK length: expected 32 bytes, got ${kek.length}`);
  }
  return kek;
}

/**
 * Wraps a per-user DEK using the master Key Encryption Key (KEK).
 * Encrypted format: [12-byte IV][16-byte Auth Tag][Ciphertext]
 */
export function wrapDek(dek: Buffer, kekHex: string): Buffer {
  const kek = parseKek(kekHex);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, kek, iv);
  const encrypted = Buffer.concat([cipher.update(dek), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]);
}

/**
 * Unwraps a per-user DEK using the master KEK.
 */
export function unwrapDek(wrappedDek: Buffer, kekHex: string): Buffer {
  const kek = parseKek(kekHex);
  if (wrappedDek.length < IV_LENGTH + TAG_LENGTH) {
    throw new SecurityError('Invalid wrapped DEK payload');
  }

  const iv = wrappedDek.subarray(0, IV_LENGTH);
  const tag = wrappedDek.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = wrappedDek.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, kek, iv);
  decipher.setAuthTag(tag);

  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new SecurityError('Failed to unwrap DEK: authentication verification failed');
  }
}

/**
 * Encrypts token data using a per-user DEK.
 * Format: hex string of [12-byte IV][16-byte Tag][Ciphertext]
 */
export function encryptWithDek(plaintext: string, dek: Buffer): string {
  if (dek.length !== KEY_LENGTH) {
    throw new SecurityError(`Invalid DEK length: expected 32 bytes, got ${dek.length}`);
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, dek, iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('hex');
}

/**
 * Decrypts token data using a per-user DEK.
 */
export function decryptWithDek(ciphertextHex: string, dek: Buffer): string {
  if (dek.length !== KEY_LENGTH) {
    throw new SecurityError(`Invalid DEK length: expected 32 bytes, got ${dek.length}`);
  }
  const payload = Buffer.from(ciphertextHex, 'hex');
  if (payload.length < IV_LENGTH + TAG_LENGTH) {
    throw new SecurityError('Invalid ciphertext payload');
  }

  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = payload.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, dek, iv);
  decipher.setAuthTag(tag);

  try {
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    throw new SecurityError('Failed to decrypt data: authentication tag mismatch');
  }
}

/**
 * Rotates the master KEK for a user DEK without changing the inner tokens.
 */
export function rotateMasterKek(wrappedDek: Buffer, oldKekHex: string, newKekHex: string): Buffer {
  const unwrappedDek = unwrapDek(wrappedDek, oldKekHex);
  return wrapDek(unwrappedDek, newKekHex);
}
