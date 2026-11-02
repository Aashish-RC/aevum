/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: services/identity/src/index.ts
 * Purpose: Entrypoint for Pillar #13 Identity service
 */

export const IDENTITY_PILLAR_VERSION = '1.0.0';
export const IDENTITY_PILLAR_ID = 13;
export const IDENTITY_PILLAR_NAME = 'Identity/Profile';

export * from './validators/password.js';
export * from './services/auth-repository.js';
export * from './services/auth-service.js';
export * from './services/session-service.js';
