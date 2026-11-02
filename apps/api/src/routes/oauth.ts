/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: apps/api/src/routes/oauth.ts
 * Purpose: Fastify routes for OAuth start, callback, revocation, and scope inquiry
 */

import { verifySessionJwt } from '@aevum/crypto';
import { OAuthService } from '@aevum/identity';
import { AuthenticationError, ValidationError, config } from '@aevum/shared';
import type { FastifyPluginAsync } from 'fastify';

export const oauthRoutes: FastifyPluginAsync = async (app) => {
  const oauthService = new OAuthService();

  const extractAuthToken = (authHeader?: string) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or malformed Authorization header', 'UNAUTHENTICATED');
    }
    return authHeader.substring(7);
  };

  // GET /v1/auth/oauth/:provider/start
  app.get<{
    Params: { provider: string };
    Querystring: { redirect_uri?: string; scopes?: string };
  }>('/:provider/start', async (request, reply) => {
    const { provider } = request.params;
    const redirectUri =
      request.query.redirect_uri ||
      `http://${config.HOST}:${config.PORT}/v1/auth/oauth/${provider}/callback`;

    const extraScopes = request.query.scopes ? request.query.scopes.split(',') : [];
    const { url, state } = oauthService.getAuthorizationUrl(provider, redirectUri, extraScopes);

    return reply.status(200).send({ url, state });
  });

  // GET /v1/auth/oauth/:provider/callback
  app.get<{
    Params: { provider: string };
    Querystring: { code?: string; state?: string; redirect_uri?: string; device_id?: string };
  }>('/:provider/callback', async (request, reply) => {
    const { provider } = request.params;
    const { code, redirect_uri, device_id } = request.query;

    if (!code) {
      throw new ValidationError('Missing OAuth authorization code in query', 'MISSING_CODE');
    }

    const redirectUri =
      redirect_uri || `http://${config.HOST}:${config.PORT}/v1/auth/oauth/${provider}/callback`;

    const result = await oauthService.handleCallback(provider, {
      code,
      redirectUri,
      deviceId: device_id || null,
      userAgent: request.headers['user-agent'] || null,
      ip: request.ip || null,
    });

    return reply.status(200).send(result);
  });

  // DELETE /v1/auth/oauth/:provider
  app.delete<{ Params: { provider: string } }>('/:provider', async (request, reply) => {
    const token = extractAuthToken(request.headers.authorization);
    const payload = await verifySessionJwt(token, config.AEVUM_JWT_SECRET);
    const { provider } = request.params;

    await oauthService.revokeProviderLink(payload.sub, provider);
    return reply.status(200).send({ status: 'ok' });
  });

  // GET /v1/auth/oauth/:provider/scopes
  app.get<{ Params: { provider: string } }>('/:provider/scopes', async (request, reply) => {
    const token = extractAuthToken(request.headers.authorization);
    const payload = await verifySessionJwt(token, config.AEVUM_JWT_SECRET);
    const { provider } = request.params;

    const scopes = await oauthService.getGrantedScopes(payload.sub, provider);
    return reply.status(200).send({ provider, scopes });
  });
};
