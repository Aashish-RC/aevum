/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: services/identity/src/services/auth-repository.ts
 * Purpose: Database repository abstraction for authentication operations
 */

import { type AevumDatabase, auditLog, session, user } from '@aevum/db';
import { eq } from 'drizzle-orm';

export type UserInsert = typeof user.$inferInsert;
export type UserSelect = typeof user.$inferSelect;
export type SessionInsert = typeof session.$inferInsert;
export type SessionSelect = typeof session.$inferSelect;
export type AuditLogInsert = typeof auditLog.$inferInsert;

export interface IAuthRepository {
  findUserByEmail(email: string): Promise<UserSelect | null>;
  findUserById(id: string): Promise<UserSelect | null>;
  createUser(data: UserInsert): Promise<UserSelect>;
  updateUserLastLogin(userId: string, lastLoginAt: Date): Promise<void>;
  createSession(data: SessionInsert): Promise<SessionSelect>;
  findSessionsByUserId(userId: string): Promise<SessionSelect[]>;
  findSessionById(id: string): Promise<SessionSelect | null>;
  findSessionByRefreshTokenHash(hash: string): Promise<SessionSelect | null>;
  updateSession(
    id: string,
    patch: Partial<Omit<SessionInsert, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<SessionSelect>;
  findSessionById(id: string): Promise<SessionSelect | null>;
  findSessionByRefreshTokenHash(hash: string): Promise<SessionSelect | null>;
  updateSession(
    id: string,
    patch: Partial<Omit<SessionInsert, 'id' | 'userId' | 'createdAt'>>
  ): Promise<SessionSelect>;
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
    patch: Partial<Omit<SessionInsert, 'id' | 'userId' | 'createdAt'>>
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

  public async createAuditLog(data: AuditLogInsert): Promise<void> {
    await this.db.insert(auditLog).values(data);
  }
}
