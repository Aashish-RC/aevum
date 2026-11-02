/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: services/identity/src/services/oauth-service.test.ts
 * Purpose: Unit tests for Google and Apple OAuth login, vault encryption, and consent tracking
 */

import { describe, expect, it, vi } from 'vitest';
import type { IOAuthProvider } from '../providers/oauth-provider.js';
import { InMemoryAuthRepository } from '../test/in-memory-auth-repository.js';
import { OAuthService } from './oauth-service.js';

describe('OAuthService — Google & Apple', () => {
  const masterKek = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const jwtSecret = 'test-secret-at-least-32-chars-long!';

  function createMockGoogleProvider(): IOAuthProvider {
    return {
      providerName: 'google',
      getAuthorizationUrl: vi.fn(
        (state: string, redirectUri: string) =>
          `https://accounts.google.com/o/oauth2/v2/auth?state=${state}&redirect_uri=${redirectUri}`,
      ),
      exchangeCode: vi.fn(async () => ({
        accessToken: 'ya29.sample_google_access_token',
        refreshToken: '1//sample_google_refresh_token',
        expiresIn: 3600,
        tokenType: 'Bearer',
        scopesGranted: ['openid', 'email', 'profile', 'drive.file'],
      })),
      getUserProfile: vi.fn(async () => ({
        providerUserId: 'google_user_12345',
        email: 'alice.google@gmail.com',
        emailVerified: true,
        displayName: 'Alice Google',
        avatarUrl: 'https://lh3.googleusercontent.com/photo.jpg',
      })),
    };
  }

  function createMockAppleProvider(): IOAuthProvider {
    return {
      providerName: 'apple',
      getAuthorizationUrl: vi.fn(
        (state: string, redirectUri: string) =>
          `https://appleid.apple.com/auth/authorize?state=${state}&redirect_uri=${redirectUri}`,
      ),
      exchangeCode: vi.fn(async () => ({
        accessToken: 'apple.sample_access_token',
        refreshToken: 'apple.sample_refresh_token',
        expiresIn: 3600,
        tokenType: 'Bearer',
        scopesGranted: ['name', 'email'],
      })),
      getUserProfile: vi.fn(async () => ({
        providerUserId: 'apple_sub_67890',
        email: 'bob.apple@privaterelay.appleid.com',
        emailVerified: true,
        displayName: 'Bob Apple',
      })),
    };
  }

  // T13.4
  it('T13.4: OAuth Google login creates user, links oauth_link, grants drive.file scope, logs consent and audit', async () => {
    const repo = new InMemoryAuthRepository();
    const googleProvider = createMockGoogleProvider();
    const oauthService = new OAuthService({
      repo,
      providers: [googleProvider],
      masterKek,
      jwtSecret,
    });

    const result = await oauthService.handleCallback('google', {
      code: 'auth_code_from_google',
      redirectUri: 'http://localhost:3000/v1/auth/oauth/google/callback',
      deviceId: 'device_desktop',
      ip: '10.0.0.1',
    });

    // 1. User created
    expect(result.user.email).toBe('alice.google@gmail.com');
    expect(result.user.displayName).toBe('Alice Google');
    expect(result.sessionToken).toBeDefined();

    // 2. oauth_link row created with encrypted tokens (NOT plaintext)
    expect(repo.oauthLinks.length).toBe(1);
    const link = repo.oauthLinks[0];
    expect(link).toBeDefined();
    if (!link) throw new Error('Expected link to be defined');
    expect(link.provider).toBe('google');
    expect(link.providerUserId).toBe('google_user_12345');
    expect(link.accessTokenEncrypted).toBeDefined();
    expect(link.accessTokenEncrypted).not.toBe('ya29.sample_google_access_token');
    expect(link.refreshTokenEncrypted).toBeDefined();
    expect(link.refreshTokenEncrypted).not.toBe('1//sample_google_refresh_token');
    expect(link.scopesGranted).toContain('drive.file');

    // 3. Consent logged for drive.file
    const driveConsent = repo.consents.find(
      (c) => c.provider === 'google' && c.scope === 'drive.file' && c.status === 'granted',
    );
    expect(driveConsent).toBeDefined();

    // 4. Audit logged
    const audit = repo.auditLogs.find((a) => a.event === 'oauth_linked');
    expect(audit).toBeDefined();
    const metadata = audit?.metadata as Record<string, unknown> | undefined;
    expect(metadata?.provider).toBe('google');
  });

  // T13.5
  it('T13.5: OAuth Apple login creates user, links oauth_link, grants scopes, and logs consent', async () => {
    const repo = new InMemoryAuthRepository();
    const appleProvider = createMockAppleProvider();
    const oauthService = new OAuthService({
      repo,
      providers: [appleProvider],
      masterKek,
      jwtSecret,
    });

    const result = await oauthService.handleCallback('apple', {
      code: 'auth_code_from_apple',
      redirectUri: 'http://localhost:3000/v1/auth/oauth/apple/callback',
      deviceId: 'device_iphone',
    });

    // 1. User created
    expect(result.user.email).toBe('bob.apple@privaterelay.appleid.com');
    expect(result.user.displayName).toBe('Bob Apple');

    // 2. oauth_link row created
    expect(repo.oauthLinks.length).toBe(1);
    const link = repo.oauthLinks[0];
    expect(link).toBeDefined();
    if (!link) throw new Error('Expected link to be defined');
    expect(link.provider).toBe('apple');
    expect(link.providerUserId).toBe('apple_sub_67890');
    expect(link.accessTokenEncrypted).toBeDefined();

    // 3. Consent logged for name & email
    const emailConsent = repo.consents.find(
      (c) => c.provider === 'apple' && c.scope === 'email' && c.status === 'granted',
    );
    expect(emailConsent).toBeDefined();
  });
});
