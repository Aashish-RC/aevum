/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: apps/api/src/routes/auth.ts
 * Purpose: Authentication route handlers for registration, login, and current user retrieval
 */

import { verifySessionJwt } from '@aevum/crypto';
import { AuthService } from '@aevum/identity';
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

export const authRoutes: FastifyPluginAsync = async (app) => {
  const authService = new AuthService();

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

  // GET /v1/auth/me
  app.get('/me', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or malformed Authorization header', 'UNAUTHENTICATED');
    }

    const token = authHeader.substring(7);
    const payload = await verifySessionJwt(token, config.AEVUM_JWT_SECRET);
    const me = await authService.getMe(payload.sub);

    return reply.status(200).send(me);
  });
};
