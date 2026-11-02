/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Portions Copyright (c) Better Auth authors.
 * Licensed under the MIT License.
 *
 * File: services/identity/src/services/session-service.ts
 * Purpose: Session lifecycle, JWT issuance, rotation, and revocation manager
 */

import { createSessionJwt, generateRefreshToken, hashRefreshToken } from '@aevum/crypto';
import { db as defaultDb } from '@aevum/db';
import { AuthenticationError, AuthorizationError, NotFoundError, config } from '@aevum/shared';
import {
  DrizzleAuthRepository,
  type IAuthRepository,
  type SessionSelect,
} from './auth-repository.js';

export interface RotateTokenInput {
  refreshToken: string;
  deviceId?: string | null;
  userAgent?: string | null;
  ip?: string | null;
}

export interface SessionResult {
  sessionToken: string;
  refreshToken: string;
  sessionId: string;
  expiresAt: Date;
}

export interface SessionSummary {
  id: string;
  deviceId: string | null;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
}

export class SessionService {
  private repo: IAuthRepository;
  private jwtSecret: string;

  constructor(options?: { repo?: IAuthRepository; jwtSecret?: string }) {
    this.repo = options?.repo || new DrizzleAuthRepository(defaultDb);
    this.jwtSecret = options?.jwtSecret || config.AEVUM_JWT_SECRET;
  }

  /**
   * Rotates a refresh token: invalidates old token, hashes and stores new token,
   * and issues a new session JWT + refresh token pair (T13.3).
   */
  public async rotateRefreshToken(input: RotateTokenInput): Promise<SessionResult> {
    const oldHash = hashRefreshToken(input.refreshToken);
    const existingSession = await this.repo.findSessionByRefreshTokenHash(oldHash);

    if (!existingSession) {
      throw new AuthenticationError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }

    if (existingSession.revoked) {
      throw new AuthenticationError('Session has been revoked', 'SESSION_REVOKED');
    }

    const now = new Date();
    if (existingSession.expiresAt <= now) {
      throw new AuthenticationError('Session has expired', 'SESSION_EXPIRED');
    }

    // Verify user account status
    const sessionUser = await this.repo.findUserById(existingSession.userId);
    if (!sessionUser || sessionUser.status !== 'active') {
      throw new AuthorizationError('Account is not active', 'ACCOUNT_INACTIVE');
    }

    // One-time use: Generate new refresh token and rotate hash
    const newRefreshToken = generateRefreshToken();
    const newHash = hashRefreshToken(newRefreshToken);

    const updatedSession = await this.repo.updateSession(existingSession.id, {
      refreshTokenHash: newHash,
      lastUsedAt: now,
      deviceId: input.deviceId ?? existingSession.deviceId,
      userAgent: input.userAgent ?? existingSession.userAgent,
      ip: input.ip ?? existingSession.ip,
    });

    const jwtExp = Math.floor(now.getTime() / 1000) + 60 * 60; // 60 min base

    const sessionToken = await createSessionJwt(
      {
        sub: existingSession.userId,
        aud: ['aevum'],
        exp: jwtExp,
        scope: 'core:read core:write',
        device_id: updatedSession.deviceId,
        session_id: updatedSession.id,
        ttl_reason: 'token_refresh',
        ttl_computed_min: 60,
      },
      this.jwtSecret,
    );

    await this.repo.createAuditLog({
      userId: existingSession.userId,
      event: 'token_refresh',
      metadata: {
        sessionId: updatedSession.id,
        deviceId: updatedSession.deviceId,
      },
      ip: input.ip || null,
      userAgent: input.userAgent || null,
    });

    return {
      sessionToken,
      refreshToken: newRefreshToken,
      sessionId: updatedSession.id,
      expiresAt: updatedSession.expiresAt,
    };
  }

  /**
   * Revokes a specific session by ID (T13.15).
   */
  public async revokeSession(sessionId: string, userId: string): Promise<void> {
    const existingSession = await this.repo.findSessionById(sessionId);

    if (!existingSession || existingSession.userId !== userId) {
      throw new NotFoundError('Session not found', 'SESSION_NOT_FOUND');
    }

    if (existingSession.revoked) {
      return;
    }

    await this.repo.updateSession(sessionId, { revoked: true });

    await this.repo.createAuditLog({
      userId,
      event: 'session_revoked',
      metadata: { sessionId },
      ip: null,
      userAgent: null,
    });
  }

  /**
   * Logs out user by revoking the current session.
   */
  public async logout(sessionId: string, userId: string): Promise<void> {
    const existingSession = await this.repo.findSessionById(sessionId);

    if (!existingSession || existingSession.userId !== userId) {
      throw new NotFoundError('Session not found', 'SESSION_NOT_FOUND');
    }

    await this.repo.updateSession(sessionId, { revoked: true });

    await this.repo.createAuditLog({
      userId,
      event: 'logout',
      metadata: { sessionId },
      ip: null,
      userAgent: null,
    });
  }

  /**
   * Lists active sessions for a user.
   */
  public async listSessions(userId: string): Promise<SessionSummary[]> {
    const sessions = await this.repo.findSessionsByUserId(userId);
    const now = new Date();

    return sessions
      .filter((s) => !s.revoked && s.expiresAt > now)
      .map((s) => this.toSessionSummary(s));
  }

  private toSessionSummary(raw: SessionSelect): SessionSummary {
    return {
      id: raw.id,
      deviceId: raw.deviceId,
      userAgent: raw.userAgent,
      ip: raw.ip,
      createdAt: raw.createdAt,
      lastUsedAt: raw.lastUsedAt,
      expiresAt: raw.expiresAt,
    };
  }
}
