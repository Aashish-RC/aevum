/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/db/src/client.ts
 * Purpose: Drizzle ORM database client factory and lifecycle management
 */

import { type NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

const { Pool } = pg;

export type AevumDatabase = NodePgDatabase<typeof schema>;

let poolInstance: pg.Pool | null = null;
let dbInstance: AevumDatabase | null = null;

export function getPool(connectionString?: string): pg.Pool {
  if (!poolInstance) {
    const connStr =
      connectionString ||
      process.env.DATABASE_URL ||
      'postgres://aevum:aevum_dev_password@localhost:5432/aevum_identity';

    poolInstance = new Pool({
      connectionString: connStr,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return poolInstance;
}

export function createDbClient(connectionString?: string): AevumDatabase {
  if (!dbInstance || connectionString) {
    const pool = getPool(connectionString);
    const client = drizzle(pool, { schema });
    if (!connectionString) {
      dbInstance = client;
    }
    return client;
  }
  return dbInstance;
}

export const db = createDbClient();

export async function closeDbClient(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
    dbInstance = null;
  }
}
