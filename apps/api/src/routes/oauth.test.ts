/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: apps/api/src/routes/oauth.test.ts
 * Purpose: Integration tests for /v1/auth/oauth HTTP endpoints
 */

import { createSessionJwt } from '@aevum/crypto';
import { OAuthService } from '@aevum/identity';
import { config } from '@aevum/shared';
import { describe, expect, it, vi } from 'vitest';
import { buildServer } from '../server.js';

describe('OAuth HTTP Endpoints (/v1/auth/oauth)', () => {
  it('GET /v1/auth/oauth/:provider/start returns authorization URL', async () => {
    const startMock = vi.spyOn(OAuthService.prototype, 'getAuthorizationUrl').mockReturnValue({
      url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test',
      state: 'sample_state_hex',
    });

    const app = await buildServer();
    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/oauth/google/start',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.url).toContain('https://accounts.google.com');
    expect(body.state).toBe('sample_state_hex');

    startMock.mockRestore();
    await app.close();
  });

  it('GET /v1/auth/oauth/:provider/callback exchanges code and returns session', async () => {
    const callbackMock = vi.spyOn(OAuthService.prototype, 'handleCallback').mockResolvedValue({
      user: {
        id: 'usr_oauth_1',
        email: 'oauth.user@example.com',
        displayName: 'OAuth User',
        emailVerified: true,
        avatarUrl: null,
        locale: 'en',
        timezone: 'UTC',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        status: 'active',
      },
      sessionToken: 'oauth.session.jwt',
      refreshToken: 'oauth_refresh_token',
      sessionId: 'ses_oauth_1',
      expiresAt: new Date(),
    });

    const app = await buildServer();
    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/oauth/google/callback?code=test_code_123',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.user.email).toBe('oauth.user@example.com');
    expect(body.sessionToken).toBe('oauth.session.jwt');

    callbackMock.mockRestore();
    await app.close();
  });

  it('GET /v1/auth/oauth/:provider/scopes returns granted scopes for authenticated user', async () => {
    const scopesMock = vi
      .spyOn(OAuthService.prototype, 'getGrantedScopes')
      .mockResolvedValue(['openid', 'email', 'profile', 'drive.file']);

    const validJwt = await createSessionJwt(
      {
        sub: 'usr_oauth_1',
        aud: ['aevum'],
        exp: Math.floor(Date.now() / 1000) + 3600,
        scope: 'core:read',
        device_id: 'phone',
        session_id: 'ses_1',
      },
      config.AEVUM_JWT_SECRET,
    );

    const app = await buildServer();
    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/oauth/google/scopes',
      headers: {
        authorization: `Bearer ${validJwt}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.provider).toBe('google');
    expect(body.scopes).toContain('drive.file');

    scopesMock.mockRestore();
    await app.close();
  });
});
