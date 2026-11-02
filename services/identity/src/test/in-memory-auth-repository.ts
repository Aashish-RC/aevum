/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: services/identity/src/test/in-memory-auth-repository.ts
 * Purpose: In-memory repository implementation for deterministic testing
 */

import type {
  AuditLogInsert,
  IAuthRepository,
  SessionInsert,
  SessionSelect,
  UserInsert,
  UserSelect,
} from '../services/auth-repository.js';

export class InMemoryAuthRepository implements IAuthRepository {
  public users: UserSelect[] = [];
  public sessions: SessionSelect[] = [];
  public auditLogs: AuditLogInsert[] = [];

  public async findUserByEmail(email: string): Promise<UserSelect | null> {
    return this.users.find((u) => u.email === email) || null;
  }

  public async findUserById(id: string): Promise<UserSelect | null> {
    return this.users.find((u) => u.id === id) || null;
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

  public async findSessionById(id: string): Promise<SessionSelect | null> {
    return this.sessions.find((s) => s.id === id) || null;
  }

  public async findSessionByRefreshTokenHash(hash: string): Promise<SessionSelect | null> {
    return this.sessions.find((s) => s.refreshTokenHash === hash) || null;
  }

  public async updateSession(
    id: string,
    patch: Partial<Omit<SessionInsert, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<SessionSelect> {
    const found = this.sessions.find((s) => s.id === id);
    if (!found) {
      throw new Error('Session not found');
    }
    Object.assign(found, patch);
    return found;
  }

  public async createAuditLog(data: AuditLogInsert): Promise<void> {
    this.auditLogs.push(data);
  }
}
