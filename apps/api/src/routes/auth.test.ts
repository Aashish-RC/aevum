/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: apps/api/src/routes/auth.test.ts
 * Purpose: Integration tests for /v1/auth HTTP endpoints
 */

import { AuthService } from '@aevum/identity';
import { AuthenticationError, ValidationError } from '@aevum/shared';
import { describe, expect, it, vi } from 'vitest';
import { buildServer } from '../server.js';

describe('Auth HTTP Endpoints (/v1/auth)', () => {
  it('POST /v1/auth/register returns 201 on valid input', async () => {
    const registerMock = vi.spyOn(AuthService.prototype, 'register').mockResolvedValue({
      user: {
        id: 'usr_test_1',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: false,
        avatarUrl: null,
        locale: 'en',
        timezone: 'UTC',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        status: 'active',
      },
      sessionToken: 'test.session.token',
      refreshToken: 'test_refresh_token',
      sessionId: 'ses_test_1',
      expiresAt: new Date(),
    });

    const app = await buildServer();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'ValidPassword123!@#',
        displayName: 'Test User',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.user.email).toBe('test@example.com');
    expect(body.sessionToken).toBe('test.session.token');

    registerMock.mockRestore();
    await app.close();
  });

  it('POST /v1/auth/register returns 400 when password policy fails', async () => {
    const registerMock = vi
      .spyOn(AuthService.prototype, 'register')
      .mockRejectedValue(new ValidationError('Password must be 12-21 characters', 'LENGTH'));

    const app = await buildServer();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'short',
        displayName: 'Test User',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.code).toBe('LENGTH');

    registerMock.mockRestore();
    await app.close();
  });

  it('POST /v1/auth/login returns 200 on successful login', async () => {
    const loginMock = vi.spyOn(AuthService.prototype, 'login').mockResolvedValue({
      user: {
        id: 'usr_test_1',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: false,
        avatarUrl: null,
        locale: 'en',
        timezone: 'UTC',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        status: 'active',
      },
      sessionToken: 'test.session.token',
      refreshToken: 'test_refresh_token',
      sessionId: 'ses_test_1',
      expiresAt: new Date(),
    });

    const app = await buildServer();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'ValidPassword123!@#',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.user.email).toBe('test@example.com');

    loginMock.mockRestore();
    await app.close();
  });

  it('POST /v1/auth/login returns 401 on invalid credentials', async () => {
    const loginMock = vi
      .spyOn(AuthService.prototype, 'login')
      .mockRejectedValue(
        new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS'),
      );

    const app = await buildServer();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'WrongPassword123!@#',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.code).toBe('INVALID_CREDENTIALS');

    loginMock.mockRestore();
    await app.close();
  });
});
