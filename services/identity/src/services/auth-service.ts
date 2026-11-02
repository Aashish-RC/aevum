/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: services/identity/src/services/auth-service.ts
 * Purpose: Email/password authentication, registration, session issuance, and login verification
 */

import { generateDek, wrapDek } from '@aevum/crypto';
import {
  createSessionJwt,
  generateRefreshToken,
  hashPassword,
  hashRefreshToken,
  verifyPassword,
} from '@aevum/crypto';
import { db as defaultDb } from '@aevum/db';
import {
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
  config,
} from '@aevum/shared';
import { validatePassword } from '../validators/password.js';
import { DrizzleAuthRepository, type IAuthRepository, type UserSelect } from './auth-repository.js';

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  locale?: string;
  timezone?: string;
  deviceId?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  skipBreachCheck?: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
  deviceId?: string | null;
  userAgent?: string | null;
  ip?: string | null;
}

export interface SafeUser {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  locale: string;
  timezone: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  status: string;
}

export interface AuthSessionResult {
  user: SafeUser;
  sessionToken: string;
  refreshToken: string;
  sessionId: string;
  expiresAt: Date;
}

export class AuthService {
  private repo: IAuthRepository;
  private masterKek: string;
  private jwtSecret: string;

  constructor(options?: { repo?: IAuthRepository; masterKek?: string; jwtSecret?: string }) {
    this.repo = options?.repo || new DrizzleAuthRepository(defaultDb);
    this.masterKek = options?.masterKek || config.AEVUM_MASTER_KEK;
    this.jwtSecret = options?.jwtSecret || config.AEVUM_JWT_SECRET;
  }

  /**
   * Registers a new user with email and password.
   */
  public async register(input: RegisterInput): Promise<AuthSessionResult> {
    const email = input.email.trim().toLowerCase();
    const displayName = input.displayName.trim();

    // Validate password policy
    const pwValidation = await validatePassword(
      input.password,
      { email, display_name: displayName },
      { checkBreach: !input.skipBreachCheck },
    );

    if (!pwValidation.ok) {
      throw new ValidationError(pwValidation.message, pwValidation.code);
    }

    // Check for existing user
    const existing = await this.repo.findUserByEmail(email);
    if (existing) {
      throw new ConflictError(
        'A user with this email address already exists',
        'EMAIL_ALREADY_EXISTS',
      );
    }

    // Hash password & generate per-user DEK
    const passwordHash = await hashPassword(input.password);
    const dek = generateDek();
    const wrappedDek = wrapDek(dek, this.masterKek);
    const now = new Date();

    const createdUser = await this.repo.createUser({
      email,
      displayName,
      passwordHash,
      locale: input.locale || 'en',
      timezone: input.timezone || 'UTC',
      dekWrapped: wrappedDek,
      dekVersion: 1,
      dekCreatedAt: now,
      status: 'active',
      lastLoginAt: now,
    });

    // Create session
    const sessionResult = await this.createSession({
      userId: createdUser.id,
      deviceId: input.deviceId,
      userAgent: input.userAgent,
      ip: input.ip,
    });

    // Record audit log
    await this.repo.createAuditLog({
      userId: createdUser.id,
      event: 'login_success',
      metadata: {
        action: 'register',
        method: 'password',
        sessionId: sessionResult.sessionId,
      },
      ip: input.ip || null,
      userAgent: input.userAgent || null,
    });

    return {
      user: this.toSafeUser(createdUser),
      ...sessionResult,
    };
  }

  /**
   * Authenticates a user with email and password.
   */
  public async login(input: LoginInput): Promise<AuthSessionResult> {
    const email = input.email.trim().toLowerCase();
    const foundUser = await this.repo.findUserByEmail(email);

    if (!foundUser || !foundUser.passwordHash) {
      await this.repo.createAuditLog({
        userId: foundUser?.id || null,
        event: 'login_failure',
        metadata: {
          email,
          reason: 'INVALID_CREDENTIALS',
        },
        ip: input.ip || null,
        userAgent: input.userAgent || null,
      });

      throw new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Check account status
    if (foundUser.status === 'suspended') {
      await this.repo.createAuditLog({
        userId: foundUser.id,
        event: 'login_failure',
        metadata: {
          email,
          reason: 'ACCOUNT_SUSPENDED',
        },
        ip: input.ip || null,
        userAgent: input.userAgent || null,
      });

      throw new AuthorizationError('Account is suspended', 'ACCOUNT_SUSPENDED');
    }

    if (foundUser.status !== 'active') {
      throw new AuthorizationError('Account is not active', 'ACCOUNT_INACTIVE');
    }

    const isPwValid = await verifyPassword(input.password, foundUser.passwordHash);
    if (!isPwValid) {
      await this.repo.createAuditLog({
        userId: foundUser.id,
        event: 'login_failure',
        metadata: {
          email,
          reason: 'INVALID_CREDENTIALS',
        },
        ip: input.ip || null,
        userAgent: input.userAgent || null,
      });

      throw new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const now = new Date();
    await this.repo.updateUserLastLogin(foundUser.id, now);

    const sessionResult = await this.createSession({
      userId: foundUser.id,
      deviceId: input.deviceId,
      userAgent: input.userAgent,
      ip: input.ip,
    });

    await this.repo.createAuditLog({
      userId: foundUser.id,
      event: 'login_success',
      metadata: {
        action: 'login',
        method: 'password',
        sessionId: sessionResult.sessionId,
      },
      ip: input.ip || null,
      userAgent: input.userAgent || null,
    });

    return {
      user: this.toSafeUser({ ...foundUser, lastLoginAt: now }),
      ...sessionResult,
    };
  }

  /**
   * Retrieves user profile and active sessions for /v1/auth/me.
   */
  public async getMe(userId: string): Promise<{ user: SafeUser; sessionsCount: number }> {
    const foundUser = await this.repo.findUserById(userId);

    if (!foundUser) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    const sessions = await this.repo.findSessionsByUserId(userId);
    const now = new Date();
    const activeCount = sessions.filter((s) => !s.revoked && s.expiresAt > now).length;

    return {
      user: this.toSafeUser(foundUser),
      sessionsCount: activeCount,
    };
  }

  private async createSession(params: {
    userId: string;
    deviceId?: string | null;
    userAgent?: string | null;
    ip?: string | null;
  }): Promise<{ sessionToken: string; refreshToken: string; sessionId: string; expiresAt: Date }> {
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const createdSession = await this.repo.createSession({
      userId: params.userId,
      refreshTokenHash,
      deviceId: params.deviceId || null,
      userAgent: params.userAgent || null,
      ip: params.ip || null,
      expiresAt,
      revoked: false,
    });

    const jwtExp = Math.floor(now.getTime() / 1000) + 60 * 60;

    const sessionToken = await createSessionJwt(
      {
        sub: params.userId,
        aud: ['aevum'],
        exp: jwtExp,
        scope: 'core:read core:write',
        device_id: params.deviceId || null,
        session_id: createdSession.id,
        ttl_reason: 'base_ttl',
        ttl_computed_min: 60,
      },
      this.jwtSecret,
    );

    return {
      sessionToken,
      refreshToken,
      sessionId: createdSession.id,
      expiresAt,
    };
  }

  private toSafeUser(raw: UserSelect): SafeUser {
    return {
      id: raw.id,
      email: raw.email,
      displayName: raw.displayName,
      emailVerified: raw.emailVerified,
      avatarUrl: raw.avatarUrl,
      locale: raw.locale,
      timezone: raw.timezone,
      createdAt: raw.createdAt,
      lastLoginAt: raw.lastLoginAt,
      status: raw.status,
    };
  }
}
