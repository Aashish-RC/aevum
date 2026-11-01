/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: apps/api/src/server.test.ts
 * Purpose: Smoke test for API server initialization and health endpoint
 */

import { describe, expect, it } from 'vitest';
import { buildServer } from './server.js';

describe('API Server Smoke Test', () => {
  it('responds with status ok on /health endpoint', async () => {
    const app = await buildServer();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    await app.close();
  });
});
