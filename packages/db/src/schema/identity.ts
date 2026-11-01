/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/db/src/schema/identity.ts
 * Purpose: Full Drizzle ORM database schema definition for Pillar #13 Identity
 */

import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const user = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  passwordHash: text('password_hash'),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  avatarUrl: text('avatar_url'),
  locale: varchar('locale', { length: 10 }).default('en').notNull(),
  timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
  dekWrapped: bytea('dek_wrapped'),
  dekVersion: integer('dek_version').default(1).notNull(),
  dekCreatedAt: timestamp('dek_created_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  status: varchar('status', { length: 20 }).default('active').notNull(),
});

export const oauthLink = pgTable(
  'oauth_link',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 20 }).notNull(),
    providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
    accessTokenEncrypted: text('access_token_encrypted'),
    refreshTokenEncrypted: text('refresh_token_encrypted'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    scopesGranted: text('scopes_granted').array().notNull().default(sql`'{}'::text[]`),
    scopesRequested: text('scopes_requested').array().notNull().default(sql`'{}'::text[]`),
    linkedAt: timestamp('linked_at', { withTimezone: true }).defaultNow().notNull(),
    lastRefreshedAt: timestamp('last_refreshed_at', { withTimezone: true }),
  },
  (table) => [unique('oauth_link_provider_user_unique').on(table.provider, table.providerUserId)],
);

export const session = pgTable('session', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  refreshTokenHash: text('refresh_token_hash').notNull(),
  deviceId: varchar('device_id', { length: 255 }),
  userAgent: text('user_agent'),
  ip: varchar('ip', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revoked: boolean('revoked').default(false).notNull(),
});

export const apiKey = pgTable('api_key', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  brainId: uuid('brain_id'),
  keyHash: text('key_hash').notNull(),
  keyPrefix: varchar('key_prefix', { length: 20 }).notNull(),
  scopes: text('scopes').array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revoked: boolean('revoked').default(false).notNull(),
});

export const profileAi = pgTable('profile_ai', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  tone: varchar('tone', { length: 20 }).default('balanced').notNull(),
  formality: varchar('formality', { length: 20 }).default('neutral').notNull(),
  preferredModalities: text('preferred_modalities')
    .array()
    .notNull()
    .default(sql`ARRAY['text']::text[]`),
  expertiseLevel: varchar('expertise_level', { length: 20 }).default('intermediate').notNull(),
  preferredResponseLanguage: varchar('preferred_response_language', { length: 10 }),
  customInstructions: text('custom_instructions'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const consent = pgTable('consent', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 20 }).notNull(),
  scope: varchar('scope', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  reason: text('reason'),
});

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  event: varchar('event', { length: 50 }).notNull(),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  ip: varchar('ip', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const jwksKey = pgTable('jwks_key', {
  kid: varchar('kid', { length: 50 }).primaryKey(),
  kty: varchar('kty', { length: 10 }).notNull(),
  publicKeyPem: text('public_key_pem').notNull(),
  privateKeyEncrypted: text('private_key_encrypted').notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  rotatedAt: timestamp('rotated_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});

export const productRegistration = pgTable('product_registration', {
  productId: varchar('product_id', { length: 50 }).primaryKey(),
  productName: varchar('product_name', { length: 100 }).notNull(),
  webhookUrl: text('webhook_url'),
  allowedScopes: text('allowed_scopes').array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  active: boolean('active').default(true).notNull(),
});
