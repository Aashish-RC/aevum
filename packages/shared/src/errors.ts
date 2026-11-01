/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: packages/shared/src/errors.ts
 * Purpose: Base error classes and standard application error taxonomy
 */

export class AevumError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, statusCode = 500, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AevumError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AevumError {
  constructor(message: string, code = 'VALIDATION_ERROR', details?: Record<string, unknown>) {
    super(message, code, 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AevumError {
  constructor(
    message = 'Authentication failed',
    code = 'UNAUTHENTICATED',
    details?: Record<string, unknown>,
  ) {
    super(message, code, 401, details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AevumError {
  constructor(
    message = 'Permission denied',
    code = 'FORBIDDEN',
    details?: Record<string, unknown>,
  ) {
    super(message, code, 403, details);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AevumError {
  constructor(
    message = 'Resource not found',
    code = 'NOT_FOUND',
    details?: Record<string, unknown>,
  ) {
    super(message, code, 404, details);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AevumError {
  constructor(
    message = 'Resource already exists',
    code = 'CONFLICT',
    details?: Record<string, unknown>,
  ) {
    super(message, code, 409, details);
    this.name = 'ConflictError';
  }
}

export class SecurityError extends AevumError {
  constructor(
    message = 'Security violation detected',
    code = 'SECURITY_ERROR',
    details?: Record<string, unknown>,
  ) {
    super(message, code, 403, details);
    this.name = 'SecurityError';
  }
}
