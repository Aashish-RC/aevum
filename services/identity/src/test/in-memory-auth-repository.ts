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
  ConsentInsert,
  ConsentSelect,
  IAuthRepository,
  OAuthLinkInsert,
  OAuthLinkSelect,
  SessionInsert,
  SessionSelect,
  UserInsert,
  UserSelect,
} from '../services/auth-repository.js';

export class InMemoryAuthRepository implements IAuthRepository {
  public users: UserSelect[] = [];
  public sessions: SessionSelect[] = [];
  public oauthLinks: OAuthLinkSelect[] = [];
  public consents: ConsentSelect[] = [];
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

  public async updateUserDek(userId: string, dekWrapped: Buffer): Promise<void> {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.dekWrapped = dekWrapped;
      user.dekCreatedAt = new Date();
      user.dekVersion = 1;
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

  public async findOAuthLink(
    provider: string,
    providerUserId: string,
  ): Promise<OAuthLinkSelect | null> {
    return (
      this.oauthLinks.find((l) => l.provider === provider && l.providerUserId === providerUserId) ||
      null
    );
  }

  public async findOAuthLinkByUserAndProvider(
    userId: string,
    provider: string,
  ): Promise<OAuthLinkSelect | null> {
    return this.oauthLinks.find((l) => l.userId === userId && l.provider === provider) || null;
  }

  public async saveOAuthLink(data: OAuthLinkInsert): Promise<OAuthLinkSelect> {
    const existingIndex = this.oauthLinks.findIndex(
      (l) => l.provider === data.provider && l.providerUserId === data.providerUserId,
    );

    const record: OAuthLinkSelect = {
      id: `oal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: data.userId,
      provider: data.provider,
      providerUserId: data.providerUserId,
      accessTokenEncrypted: data.accessTokenEncrypted || null,
      refreshTokenEncrypted: data.refreshTokenEncrypted || null,
      tokenExpiresAt: data.tokenExpiresAt || null,
      scopesGranted: data.scopesGranted || [],
      scopesRequested: data.scopesRequested || [],
      linkedAt: new Date(),
      lastRefreshedAt: new Date(),
    };

    if (existingIndex >= 0) {
      const existing = this.oauthLinks[existingIndex];
      if (!existing) {
        this.oauthLinks.push(record);
        return record;
      }
      this.oauthLinks[existingIndex] = {
        ...existing,
        accessTokenEncrypted: data.accessTokenEncrypted || null,
        refreshTokenEncrypted: data.refreshTokenEncrypted || null,
        tokenExpiresAt: data.tokenExpiresAt || null,
        scopesGranted: data.scopesGranted || existing.scopesGranted,
        scopesRequested: data.scopesRequested || existing.scopesRequested,
        lastRefreshedAt: new Date(),
      };
      return existing;
    }

    this.oauthLinks.push(record);
    return record;
  }

  public async deleteOAuthLink(userId: string, provider: string): Promise<void> {
    this.oauthLinks = this.oauthLinks.filter(
      (l) => !(l.userId === userId && l.provider === provider),
    );
  }

  public async recordConsent(data: ConsentInsert): Promise<ConsentSelect> {
    const record: ConsentSelect = {
      id: `cst_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: data.userId,
      provider: data.provider,
      scope: data.scope,
      status: data.status,
      grantedAt: new Date(),
      revokedAt: null,
      reason: data.reason || null,
    };
    this.consents.push(record);
    return record;
  }

  public async revokeConsent(userId: string, provider: string, reason?: string): Promise<void> {
    for (const c of this.consents) {
      if (c.userId === userId && c.provider === provider) {
        c.status = 'revoked';
        c.revokedAt = new Date();
        c.reason = reason || null;
      }
    }
  }

  public async findConsents(userId: string, provider: string): Promise<ConsentSelect[]> {
    return this.consents.filter((c) => c.userId === userId && c.provider === provider);
  }

  public async createAuditLog(data: AuditLogInsert): Promise<void> {
    this.auditLogs.push(data);
  }
}
