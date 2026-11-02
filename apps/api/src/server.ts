/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: apps/api/src/server.ts
 * Purpose: Fastify HTTP API gateway server and route bootstrap
 */

import { AevumError, config, logger } from '@aevum/shared';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import fastify, { type FastifyError, type FastifyInstance } from 'fastify';

export async function buildServer(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: config.AEVUM_LOG_LEVEL,
      redact: [
        'password',
        'passwordHash',
        'password_hash',
        'token',
        'accessToken',
        'refreshToken',
        'access_token',
        'refresh_token',
        'secret',
        'apiKey',
        'key_hash',
        'dek',
        'kek',
        'dek_wrapped',
        'private_key_encrypted',
        'headers.authorization',
        'headers.cookie',
      ],
    },
    disableRequestLogging: false,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(sensible);

  // Global Error Handler for Aevum taxonomy
  app.setErrorHandler((error: FastifyError | Error, _request, reply) => {
    if (error instanceof AevumError) {
      return reply.status(error.statusCode).send({
        error: error.name,
        code: error.code,
        message: error.message,
        details: error.details,
      });
    }

    // Fastify schema validation error
    if ('validation' in error && error.validation) {
      return reply.status(400).send({
        error: 'ValidationError',
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.validation,
      });
    }

    logger.error({ err: error }, 'Unhandled server error');
    return reply.status(500).send({
      error: 'InternalServerError',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred',
    });
  });

  // Health endpoint
  app.get('/health', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok' });
  });

  // Auth routes
  const { authRoutes } = await import('./routes/auth.js');
  await app.register(authRoutes, { prefix: '/v1/auth' });

  return app;
}

async function start(): Promise<void> {
  try {
    const server = await buildServer();
    await server.listen({
      port: config.PORT,
      host: config.HOST,
    });
    logger.info(`Aevum API Gateway listening on http://${config.HOST}:${config.PORT}`);
  } catch (err) {
    logger.fatal({ err }, 'Failed to start Aevum API server');
    process.exit(1);
  }
}

// Auto-start when executed directly
if (
  process.argv[1] &&
  (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'))
) {
  void start();
}
