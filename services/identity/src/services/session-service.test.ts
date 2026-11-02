/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: services/identity/src/services/session-service.test.ts
 * Purpose: Unit tests for session rotation, revocation, and multi-device management
 */

import { describe, expect, it } from 'vitest';
import { InMemoryAuthRepository } from '../test/in-memory-auth-repository.js';
import { AuthService } from './auth-service.js';
import { SessionService } from './session-service.js';

describe('SessionService', () => {
  const jwtSecret = 'test-secret-at-least-32-chars-long!';

  // T13.3
  it('T13.3: rotates refresh token, invalidating the old refresh token and issuing a new pair', async () => {
    const repo = new InMemoryAuthRepository();
    const authService = new AuthService({ repo, jwtSecret });
    const sessionService = new SessionService({ repo, jwtSecret });

    const authResult = await authService.register({
      email: 'rotate@example.com',
      password: 'SamplePassWORD123!@#',
      displayName: 'Rotate User',
      skipBreachCheck: true,
      deviceId: 'mobile_device',
    });

    const oldRefreshToken = authResult.refreshToken;

    // Rotate refresh token
    const rotated = await sessionService.rotateRefreshToken({
      refreshToken: oldRefreshToken,
    });

    expect(rotated.sessionToken).toBeDefined();
    expect(rotated.refreshToken).toBeDefined();
    expect(rotated.refreshToken).not.toBe(oldRefreshToken);
    expect(rotated.sessionId).toBe(authResult.sessionId);

    // Old refresh token must be rejected
    await expect(
      sessionService.rotateRefreshToken({
        refreshToken: oldRefreshToken,
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });

    // New refresh token can be rotated again
    const rotatedAgain = await sessionService.rotateRefreshToken({
      refreshToken: rotated.refreshToken,
    });
    expect(rotatedAgain.refreshToken).not.toBe(rotated.refreshToken);
  });

  // T13.15
  it('T13.15: allows login from 2 devices and revoking one leaves the other session working', async () => {
    const repo = new InMemoryAuthRepository();
    const authService = new AuthService({ repo, jwtSecret });
    const sessionService = new SessionService({ repo, jwtSecret });

    await authService.register({
      email: 'multidevice@example.com',
      password: 'SamplePassWORD123!@#',
      displayName: 'Multi Device User',
      skipBreachCheck: true,
    });

    // Device 1: Mobile login
    const session1 = await authService.login({
      email: 'multidevice@example.com',
      password: 'SamplePassWORD123!@#',
      deviceId: 'device_phone',
    });

    // Device 2: Laptop login
    const session2 = await authService.login({
      email: 'multidevice@example.com',
      password: 'SamplePassWORD123!@#',
      deviceId: 'device_laptop',
    });

    expect(session1.sessionId).not.toBe(session2.sessionId);

    // List active sessions: 3 (1 from register + 2 logins)
    const activeSessions = await sessionService.listSessions(session1.user.id);
    expect(activeSessions.length).toBe(3);

    // Revoke device 1 (mobile)
    await sessionService.revokeSession(session1.sessionId, session1.user.id);

    // Device 1's refresh token now fails
    await expect(
      sessionService.rotateRefreshToken({
        refreshToken: session1.refreshToken,
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'SESSION_REVOKED',
    });

    // Device 2's refresh token still works!
    const session2Refreshed = await sessionService.rotateRefreshToken({
      refreshToken: session2.refreshToken,
    });
    expect(session2Refreshed.sessionToken).toBeDefined();

    // Active sessions count decreased
    const remainingSessions = await sessionService.listSessions(session1.user.id);
    expect(remainingSessions.length).toBe(2);
    expect(remainingSessions.some((s) => s.id === session1.sessionId)).toBe(false);
    expect(remainingSessions.some((s) => s.id === session2.sessionId)).toBe(true);
  });
});
