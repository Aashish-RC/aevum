/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/db/src/migrate.ts
 * Purpose: Migration runner executing pending Drizzle schema migrations
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '@aevum/shared';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { closeDbClient, db } from './client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations(): Promise<void> {
  const migrationsFolder = path.resolve(__dirname, './migrations');
  logger.info({ migrationsFolder }, 'Running database migrations...');
  await migrate(db, { migrationsFolder });
  logger.info('Database migrations applied successfully.');
}

if (
  process.argv[1] &&
  (process.argv[1].endsWith('migrate.ts') || process.argv[1].endsWith('migrate.js'))
) {
  runMigrations()
    .then(async () => {
      await closeDbClient();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error({ err }, 'Failed to run migrations');
      await closeDbClient();
      process.exit(1);
    });
}

