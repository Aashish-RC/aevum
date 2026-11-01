/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/shared/src/logger.ts
 * Purpose: Pino structured logger configured with security redaction
 */

import pino from 'pino';

export const logger = pino({
  level: process.env.AEVUM_LOG_LEVEL || 'info',
  redact: {
    paths: [
      'password',
      'passwordHash',
      'password_hash',
      'token',
      'accessToken',
      'refreshToken',
      'access_token',
      'refresh_token',
      'secret',
      'apiKey',
      'key_hash',
      'dek',
      'kek',
      'dek_wrapped',
      'private_key_encrypted',
      'headers.authorization',
      'headers.cookie',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;
