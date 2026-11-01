/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/sdk/src/index.ts
 * Purpose: Cross-product SSO Bridge SDK for token verification via JWKS
 */

import type { ProductTokenPayload } from '@aevum/shared';
import { AuthenticationError } from '@aevum/shared';
import { type JWTVerifyOptions, createRemoteJWKSet, jwtVerify } from 'jose';

export interface AevumSsoBridgeOptions {
  issuer?: string;
  audience: string;
  jwksUrl?: string;
}

export class AevumSsoBridge {
  private issuer: string;
  private audience: string;
  private jwksUrl: string;
  private remoteJwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(options: AevumSsoBridgeOptions) {
    this.issuer = options.issuer || 'aevum';
    this.audience = options.audience;
    this.jwksUrl = options.jwksUrl || 'http://localhost:3000/v1/sso/.well-known/jwks.json';
    this.remoteJwks = createRemoteJWKSet(new URL(this.jwksUrl));
  }

  /**
   * Validates a product-specific JWT token against Aevum's JWKS.
   */
  public async verifyProductToken(
    token: string,
    options?: Partial<JWTVerifyOptions>,
  ): Promise<ProductTokenPayload> {
    try {
      const { payload } = await jwtVerify(token, this.remoteJwks, {
        issuer: this.issuer,
        audience: this.audience,
        ...options,
      });

      return {
        iss: String(payload.iss),
        sub: String(payload.sub),
        aud: String(payload.aud),
        exp: Number(payload.exp),
        iat: Number(payload.iat),
        brain_id: payload.brain_id ? String(payload.brain_id) : undefined,
        scope: String(payload.scope || ''),
        session_id: String(payload.session_id || ''),
      };
    } catch (err) {
      throw new AuthenticationError(
        `Failed to verify product token: ${err instanceof Error ? err.message : 'Unknown error'}`,
        'INVALID_TOKEN',
      );
    }
  }
}
