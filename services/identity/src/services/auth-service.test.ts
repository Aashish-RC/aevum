/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: services/identity/src/services/auth-service.test.ts
 * Purpose: Unit tests for email/password registration, login, and suspension enforcement
 */

import { describe, expect, it } from 'vitest';
import type {
  AuditLogInsert,
  IAuthRepository,
  SessionInsert,
  SessionSelect,
  UserInsert,
  UserSelect,
} from './auth-repository.js';
import { AuthService } from './auth-service.js';

class InMemoryAuthRepository implements IAuthRepository {
  public users: UserSelect[] = [];
  public sessions: SessionSelect[] = [];
  public auditLogs: AuditLogInsert[] = [];

  public async findUserByEmail(email: string): Promise<UserSelect | null> {
    const found = this.users.find((u) => u.email === email);
    return found || null;
  }

  public async findUserById(id: string): Promise<UserSelect | null> {
    const found = this.users.find((u) => u.id === id);
    return found || null;
  }

  public async createUser(data: UserInsert): Promise<UserSelect> {
    const created: UserSelect = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email: data.email,
      displayName: data.displayName,
      passwordHash: data.passwordHash || null,
      emailVerified: data.emailVerified ?? false,
      avatarUrl: data.avatarUrl || null,
      locale: data.locale || 'en',
      timezone: data.timezone || 'UTC',
      dekWrapped: data.dekWrapped || null,
      dekVersion: data.dekVersion || 1,
      dekCreatedAt: data.dekCreatedAt || new Date(),
      createdAt: data.createdAt || new Date(),
      lastLoginAt: data.lastLoginAt || new Date(),
      status: data.status || 'active',
    };
    this.users.push(created);
    return created;
  }

  public async updateUserLastLogin(userId: string, lastLoginAt: Date): Promise<void> {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.lastLoginAt = lastLoginAt;
    }
  }

  public async createSession(data: SessionInsert): Promise<SessionSelect> {
    const session: SessionSelect = {
      id: `ses_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: data.userId,
      refreshTokenHash: data.refreshTokenHash,
      deviceId: data.deviceId || null,
      userAgent: data.userAgent || null,
      ip: data.ip || null,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      expiresAt: data.expiresAt,
      revoked: data.revoked ?? false,
    };
    this.sessions.push(session);
    return session;
  }

  public async findSessionsByUserId(userId: string): Promise<SessionSelect[]> {
    return this.sessions.filter((s) => s.userId === userId);
  }

  public async createAuditLog(data: AuditLogInsert): Promise<void> {
    this.auditLogs.push(data);
  }
}

describe('AuthService — Email/Password', () => {
  // T13.1
  it('T13.1: registers user with email/password, issues session, and logs audit', async () => {
    const repo = new InMemoryAuthRepository();
    const authService = new AuthService({
      repo,
      jwtSecret: 'test-secret-at-least-32-chars-long!',
    });

    const result = await authService.register({
      email: 'bob@example.com',
      password: 'StrongPassWORD123!@#',
      displayName: 'Bob Builder',
      skipBreachCheck: true,
      deviceId: 'dev_phone_1',
      userAgent: 'Mozilla/5.0 TestBrowser',
      ip: '192.168.1.100',
    });

    expect(result.user.email).toBe('bob@example.com');
    expect(result.user.displayName).toBe('Bob Builder');
    expect(result.sessionToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.sessionId).toBeDefined();

    // Verify user stored with wrapped DEK
    expect(repo.users.length).toBe(1);
    expect(repo.users[0]?.dekWrapped).toBeDefined();

    // Verify audit log entry
    expect(repo.auditLogs.length).toBe(1);
    expect(repo.auditLogs[0]?.event).toBe('login_success');
  });

  // T13.2
  it('T13.2: logs in with email/password, updates last_login_at, and issues session', async () => {
    const repo = new InMemoryAuthRepository();
    const authService = new AuthService({
      repo,
      jwtSecret: 'test-secret-at-least-32-chars-long!',
    });

    // First register
    await authService.register({
      email: 'carol@example.com',
      password: 'MightyHERO123!@#',
      displayName: 'Carol Danvers',
      skipBreachCheck: true,
    });

    // Now login
    const loginResult = await authService.login({
      email: 'carol@example.com',
      password: 'MightyHERO123!@#',
      deviceId: 'dev_laptop_1',
    });

    expect(loginResult.user.email).toBe('carol@example.com');
    expect(loginResult.sessionToken).toBeDefined();
    expect(loginResult.refreshToken).toBeDefined();
    expect(loginResult.user.lastLoginAt).toBeDefined();
    expect(repo.sessions.length).toBe(2);
  });

  // T13.40
  it('T13.40: rejects login for suspended user with 403 / ACCOUNT_SUSPENDED', async () => {
    const repo = new InMemoryAuthRepository();
    const authService = new AuthService({
      repo,
      jwtSecret: 'test-secret-at-least-32-chars-long!',
    });

    await repo.createUser({
      email: 'banned@example.com',
      passwordHash: 'dummy_hash',
      displayName: 'Banned User',
      status: 'suspended',
      emailVerified: true,
    });

    await expect(
      authService.login({
        email: 'banned@example.com',
        password: 'AnyPassword123!@#',
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'ACCOUNT_SUSPENDED',
    });
  });
});
