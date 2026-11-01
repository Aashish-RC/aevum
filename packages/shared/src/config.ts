/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/shared/src/config.ts
 * Purpose: Central typed environment variable configuration loader
 */

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  AEVUM_ENV: z.string().default('development'),
  AEVUM_LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  DATABASE_URL: z
    .string()
    .default('postgres://aevum:aevum_dev_password@localhost:5432/aevum_identity'),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  MINIO_ENDPOINT: z.string().default('http://localhost:9000'),
  MINIO_REGION: z.string().default('us-east-1'),
  MINIO_ACCESS_KEY: z.string().default('aevum'),
  MINIO_SECRET_KEY: z.string().default('aevum_dev_only'),
  MINIO_AUDIT_BUCKET: z.string().default('aevum-audit'),
  MINIO_MEDIA_BUCKET: z.string().default('aevum-media'),
  MINIO_USE_SSL: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),

  AEVUM_MASTER_KEK: z
    .string()
    .default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  AEVUM_JWT_SECRET: z.string().default('super-secret-jwt-key-minimum-32-chars-long!'),
  AEVUM_SESSION_SECRET: z.string().default('super-secret-session-key-minimum-32-chars!'),

  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  APPLE_CLIENT_ID: z.string().optional().default(''),
  APPLE_CLIENT_SECRET: z.string().optional().default(''),
  GITHUB_CLIENT_ID: z.string().optional().default(''),
  GITHUB_CLIENT_SECRET: z.string().optional().default(''),
  GITLAB_CLIENT_ID: z.string().optional().default(''),
  GITLAB_CLIENT_SECRET: z.string().optional().default(''),
  MICROSOFT_CLIENT_ID: z.string().optional().default(''),
  MICROSOFT_CLIENT_SECRET: z.string().optional().default(''),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(overrides?: Partial<Config>): Config {
  return configSchema.parse({
    ...process.env,
    ...overrides,
  });
}

export const config = loadConfig();
