/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: apps/api/src/routes/auth.ts
 * Purpose: Authentication and session management route handlers
 */

import { verifySessionJwt } from '@aevum/crypto';
import { AuthService, SessionService } from '@aevum/identity';
import { AuthenticationError, ValidationError, config } from '@aevum/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  displayName: z.string().min(1).max(100),
  locale: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  deviceId: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceId: z.string().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
  deviceId: z.string().optional(),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  const authService = new AuthService();
  const sessionService = new SessionService();

  // Helper to extract session JWT
  const extractAuthToken = (authHeader?: string) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or malformed Authorization header', 'UNAUTHENTICATED');
    }
    return authHeader.substring(7);
  };

  // POST /v1/auth/register
  app.post('/register', async (request, reply) => {
    const parseResult = registerSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid registration parameters', 'INVALID_PARAMS', {
        issues: parseResult.error.issues,
      });
    }

    const result = await authService.register({
      ...parseResult.data,
      userAgent: request.headers['user-agent'] || null,
      ip: request.ip || null,
    });

    return reply.status(201).send(result);
  });

  // POST /v1/auth/login
  app.post('/login', async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid login parameters', 'INVALID_PARAMS', {
        issues: parseResult.error.issues,
      });
    }

    const result = await authService.login({
      ...parseResult.data,
      userAgent: request.headers['user-agent'] || null,
      ip: request.ip || null,
    });

    return reply.status(200).send(result);
  });

  // POST /v1/auth/refresh
  app.post('/refresh', async (request, reply) => {
    const parseResult = refreshSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid refresh parameters', 'INVALID_PARAMS', {
        issues: parseResult.error.issues,
      });
    }

    const result = await sessionService.rotateRefreshToken({
      refreshToken: parseResult.data.refreshToken,
      deviceId: parseResult.data.deviceId,
      userAgent: request.headers['user-agent'] || null,
      ip: request.ip || null,
    });

    return reply.status(200).send(result);
  });

  // POST /v1/auth/logout
  app.post('/logout', async (request, reply) => {
    const token = extractAuthToken(request.headers.authorization);
    const payload = await verifySessionJwt(token, config.AEVUM_JWT_SECRET);

    await sessionService.logout(payload.session_id, payload.sub);
    return reply.status(200).send({ status: 'ok' });
  });

  // GET /v1/auth/me
  app.get('/me', async (request, reply) => {
    const token = extractAuthToken(request.headers.authorization);
    const payload = await verifySessionJwt(token, config.AEVUM_JWT_SECRET);
    const me = await authService.getMe(payload.sub);

    return reply.status(200).send(me);
  });

  // GET /v1/auth/sessions
  app.get('/sessions', async (request, reply) => {
    const token = extractAuthToken(request.headers.authorization);
    const payload = await verifySessionJwt(token, config.AEVUM_JWT_SECRET);
    const sessions = await sessionService.listSessions(payload.sub);

    return reply.status(200).send(sessions);
  });

  // DELETE /v1/auth/sessions/:id
  app.delete<{ Params: { id: string } }>('/sessions/:id', async (request, reply) => {
    const token = extractAuthToken(request.headers.authorization);
    const payload = await verifySessionJwt(token, config.AEVUM_JWT_SECRET);

    await sessionService.revokeSession(request.params.id, payload.sub);
    return reply.status(200).send({ status: 'ok' });
  });
};
