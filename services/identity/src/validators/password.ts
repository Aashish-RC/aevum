/**
 * Aevum — AI Core Platform
 * Copyright (c) 2026 Aevum. All rights reserved.
 * Licensed under the MIT License.
 *
 * File: services/identity/src/validators/password.ts
 * Purpose: Password strength, character constraint, and breach validator
 */

export type PasswordErrorCode =
  | 'LENGTH'
  | 'UPPERCASE'
  | 'LOWERCASE'
  | 'DIGITS'
  | 'SPECIAL'
  | 'REPEAT'
  | 'EMAIL_IN_PW'
  | 'NAME_IN_PW'
  | 'BREACHED';

export function validatePasswordLogic(
  pw: string,
  user: { email: string; display_name?: string },
): { ok: true } | { ok: false; code: PasswordErrorCode; message: string } {
  if (pw.length < 12 || pw.length > 21) {
    return { ok: false, code: 'LENGTH', message: 'Password must be 12-21 characters' };
  }
  const upper = (pw.match(/[A-Z]/g) || []).length;
  const lower = (pw.match(/[a-z]/g) || []).length;
  const digit = (pw.match(/[0-9]/g) || []).length;
  const special = pw.length - upper - lower - digit; // catches space + everything else
  if (upper < 3)
    return { ok: false, code: 'UPPERCASE', message: 'Need at least 3 uppercase letters' };
  if (lower < 3)
    return { ok: false, code: 'LOWERCASE', message: 'Need at least 3 lowercase letters' };
  if (digit < 3) return { ok: false, code: 'DIGITS', message: 'Need at least 3 digits' };
  if (special < 3)
    return {
      ok: false,
      code: 'SPECIAL',
      message: 'Need at least 3 special characters (space counts)',
    };
  if (/(.)\1\1\1/.test(pw)) {
    return { ok: false, code: 'REPEAT', message: 'No 4+ identical consecutive characters' };
  }
  const emailLocalPart = (user.email.split('@')[0] ?? '').toLowerCase();
  if (emailLocalPart.length >= 4 && pw.toLowerCase().includes(emailLocalPart)) {
    return { ok: false, code: 'EMAIL_IN_PW', message: 'Password cannot contain email' };
  }
  if (
    user.display_name &&
    user.display_name.length >= 4 &&
    pw.toLowerCase().includes(user.display_name.toLowerCase())
  ) {
    return { ok: false, code: 'NAME_IN_PW', message: 'Password cannot contain display name' };
  }
  return { ok: true };
}

// Separate async function for HIBP check (k-anonymity: send only first 5 chars of SHA-1)
export async function checkPasswordBreach(pw: string): Promise<boolean> {
  const crypto = await import('node:crypto');
  const sha1 = crypto.createHash('sha1').update(pw).digest('hex').toUpperCase();
  const prefix = sha1.substring(0, 5);
  const suffix = sha1.substring(5);
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  const text = await res.text();
  return text.split('\n').some((line) => line.split(':')[0]?.trim() === suffix);
}

export async function validatePassword(
  pw: string,
  user: { email: string; display_name?: string },
  options: { checkBreach?: boolean } = { checkBreach: true },
): Promise<{ ok: true } | { ok: false; code: PasswordErrorCode; message: string }> {
  const logicResult = validatePasswordLogic(pw, user);
  if (!logicResult.ok) {
    return logicResult;
  }
  if (options.checkBreach) {
    const isBreached = await checkPasswordBreach(pw);
    if (isBreached) {
      return { ok: false, code: 'BREACHED', message: 'Password was found in known data breaches' };
    }
  }
  return { ok: true };
}
