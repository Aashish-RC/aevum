/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: services/identity/src/services/auth-repository.ts
 * Purpose: Database repository abstraction for authentication, session, OAuth, and consent operations
 */

import { type AevumDatabase, auditLog, consent, oauthLink, session, user } from '@aevum/db';
import { and, eq } from 'drizzle-orm';

export type UserInsert = typeof user.$inferInsert;
export type UserSelect = typeof user.$inferSelect;
export type SessionInsert = typeof session.$inferInsert;
export type SessionSelect = typeof session.$inferSelect;
export type OAuthLinkInsert = typeof oauthLink.$inferInsert;
export type OAuthLinkSelect = typeof oauthLink.$inferSelect;
export type ConsentInsert = typeof consent.$inferInsert;
export type ConsentSelect = typeof consent.$inferSelect;
export type AuditLogInsert = typeof auditLog.$inferInsert;

export interface IAuthRepository {
  findUserByEmail(email: string): Promise<UserSelect | null>;
  findUserById(id: string): Promise<UserSelect | null>;
  createUser(data: UserInsert): Promise<UserSelect>;
  updateUserLastLogin(userId: string, lastLoginAt: Date): Promise<void>;
  updateUserDek(userId: string, dekWrapped: Buffer): Promise<void>;

  createSession(data: SessionInsert): Promise<SessionSelect>;
  findSessionsByUserId(userId: string): Promise<SessionSelect[]>;
  findSessionById(id: string): Promise<SessionSelect | null>;
  findSessionByRefreshTokenHash(hash: string): Promise<SessionSelect | null>;
  updateSession(
    id: string,
    patch: Partial<Omit<SessionInsert, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<SessionSelect>;

  findOAuthLink(provider: string, providerUserId: string): Promise<OAuthLinkSelect | null>;
  findOAuthLinkByUserAndProvider(userId: string, provider: string): Promise<OAuthLinkSelect | null>;
  saveOAuthLink(data: OAuthLinkInsert): Promise<OAuthLinkSelect>;
  deleteOAuthLink(userId: string, provider: string): Promise<void>;

  recordConsent(data: ConsentInsert): Promise<ConsentSelect>;
  revokeConsent(userId: string, provider: string, reason?: string): Promise<void>;
  findConsents(userId: string, provider: string): Promise<ConsentSelect[]>;

  createAuditLog(data: AuditLogInsert): Promise<void>;
}

export class DrizzleAuthRepository implements IAuthRepository {
  private db: AevumDatabase;

  constructor(db: AevumDatabase) {
    this.db = db;
  }

  public async findUserByEmail(email: string): Promise<UserSelect | null> {
    const found = await this.db.query.user.findFirst({
      where: eq(user.email, email),
    });
    return found || null;
  }

  public async findUserById(id: string): Promise<UserSelect | null> {
    const found = await this.db.query.user.findFirst({
      where: eq(user.id, id),
    });
    return found || null;
  }

  public async createUser(data: UserInsert): Promise<UserSelect> {
    const [created] = await this.db.insert(user).values(data).returning();
    if (!created) {
      throw new Error('Failed to create user');
    }
    return created;
  }

  public async updateUserLastLogin(userId: string, lastLoginAt: Date): Promise<void> {
    await this.db.update(user).set({ lastLoginAt }).where(eq(user.id, userId));
  }

  public async updateUserDek(userId: string, dekWrapped: Buffer): Promise<void> {
    await this.db
      .update(user)
      .set({ dekWrapped, dekCreatedAt: new Date(), dekVersion: 1 })
      .where(eq(user.id, userId));
  }

  public async createSession(data: SessionInsert): Promise<SessionSelect> {
    const [created] = await this.db.insert(session).values(data).returning();
    if (!created) {
      throw new Error('Failed to create session');
    }
    return created;
  }

  public async findSessionsByUserId(userId: string): Promise<SessionSelect[]> {
    return this.db.query.session.findMany({
      where: eq(session.userId, userId),
    });
  }

  public async findSessionById(id: string): Promise<SessionSelect | null> {
    const found = await this.db.query.session.findFirst({
      where: eq(session.id, id),
    });
    return found || null;
  }

  public async findSessionByRefreshTokenHash(hash: string): Promise<SessionSelect | null> {
    const found = await this.db.query.session.findFirst({
      where: eq(session.refreshTokenHash, hash),
    });
    return found || null;
  }

  public async updateSession(
    id: string,
    patch: Partial<Omit<SessionInsert, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<SessionSelect> {
    const [updated] = await this.db
      .update(session)
      .set(patch)
      .where(eq(session.id, id))
      .returning();
    if (!updated) {
      throw new Error('Failed to update session');
    }
    return updated;
  }

  public async findOAuthLink(
    provider: string,
    providerUserId: string,
  ): Promise<OAuthLinkSelect | null> {
    const found = await this.db.query.oauthLink.findFirst({
      where: and(eq(oauthLink.provider, provider), eq(oauthLink.providerUserId, providerUserId)),
    });
    return found || null;
  }

  public async findOAuthLinkByUserAndProvider(
    userId: string,
    provider: string,
  ): Promise<OAuthLinkSelect | null> {
    const found = await this.db.query.oauthLink.findFirst({
      where: and(eq(oauthLink.userId, userId), eq(oauthLink.provider, provider)),
    });
    return found || null;
  }

  public async saveOAuthLink(data: OAuthLinkInsert): Promise<OAuthLinkSelect> {
    const existing = await this.findOAuthLink(data.provider, data.providerUserId);
    if (existing) {
      const [updated] = await this.db
        .update(oauthLink)
        .set({
          accessTokenEncrypted: data.accessTokenEncrypted,
          refreshTokenEncrypted: data.refreshTokenEncrypted,
          tokenExpiresAt: data.tokenExpiresAt,
          scopesGranted: data.scopesGranted,
          scopesRequested: data.scopesRequested,
          lastRefreshedAt: new Date(),
        })
        .where(eq(oauthLink.id, existing.id))
        .returning();
      if (!updated) throw new Error('Failed to update OAuth link');
      return updated;
    }

    const [created] = await this.db.insert(oauthLink).values(data).returning();
    if (!created) throw new Error('Failed to insert OAuth link');
    return created;
  }

  public async deleteOAuthLink(userId: string, provider: string): Promise<void> {
    await this.db
      .delete(oauthLink)
      .where(and(eq(oauthLink.userId, userId), eq(oauthLink.provider, provider)));
  }

  public async recordConsent(data: ConsentInsert): Promise<ConsentSelect> {
    const [created] = await this.db.insert(consent).values(data).returning();
    if (!created) throw new Error('Failed to record consent');
    return created;
  }

  public async revokeConsent(userId: string, provider: string, reason?: string): Promise<void> {
    await this.db
      .update(consent)
      .set({
        status: 'revoked',
        revokedAt: new Date(),
        reason: reason || 'User requested revocation',
      })
      .where(and(eq(consent.userId, userId), eq(consent.provider, provider)));
  }

  public async findConsents(userId: string, provider: string): Promise<ConsentSelect[]> {
    return this.db.query.consent.findMany({
      where: and(eq(consent.userId, userId), eq(consent.provider, provider)),
    });
  }

  public async createAuditLog(data: AuditLogInsert): Promise<void> {
    await this.db.insert(auditLog).values(data);
  }
}
