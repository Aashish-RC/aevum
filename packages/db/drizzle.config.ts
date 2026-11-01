/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/db/drizzle.config.ts
 * Purpose: Drizzle ORM configuration for migrations and schema management
 */

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/identity.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      'postgres://aevum:aevum_dev_password@localhost:5432/aevum_identity',
  },
  verbose: true,
  strict: true,
});
