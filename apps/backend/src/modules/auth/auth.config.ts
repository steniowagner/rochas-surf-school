import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ReviewCodes,
  USER_ROLES,
  UserRole,
  isValidEmail,
  normalizeEmail,
} from '@rochas-surf-school/auth';

export interface ReviewAccount {
  email: string;
  code: string;
  role: UserRole;
  name: string;
}

const DEFAULT_REFRESH_TOKEN_EXPIRES_IN_DAYS = 30;

/**
 * Parses `REVIEW_ACCOUNTS`: a JSON array of `{ email, code, role, name }`. Unset or empty → no accounts.
 * Throws on anything malformed, so a bad value stops the backend (and the seed) at startup.
 */
export function parseReviewAccounts(raw: string | undefined): ReviewAccount[] {
  if (raw === undefined || raw.trim() === '') {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('REVIEW_ACCOUNTS is not valid JSON');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('REVIEW_ACCOUNTS must be a JSON array');
  }

  const accounts = parsed.map((entry: unknown, index) => parseReviewAccount(entry, index));
  const emails = new Set(accounts.map((account) => account.email));
  if (emails.size !== accounts.length) {
    throw new Error('REVIEW_ACCOUNTS has the same email twice');
  }
  return accounts;
}

function parseReviewAccount(entry: unknown, index: number): ReviewAccount {
  const fail = (reason: string): never => {
    throw new Error(`REVIEW_ACCOUNTS[${index}] ${reason}`);
  };
  if (typeof entry !== 'object' || entry === null) {
    return fail('is not an object');
  }

  const { email, code, role, name } = entry as Record<string, unknown>;
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) fail('has an invalid email');
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) fail('has a code that is not 6 digits');
  if (!(USER_ROLES as readonly unknown[]).includes(role)) fail('has an unknown role');
  if (typeof name !== 'string' || name.trim() === '') fail('has no name');

  return {
    email: normalizedEmail,
    code: code as string,
    role: role as UserRole,
    name: (name as string).trim(),
  };
}

@Injectable()
export class AuthConfig {
  readonly codePepper: string;
  readonly refreshTokenTtlDays: number;
  readonly reviewAccounts: ReviewAccount[];

  constructor(configService: ConfigService) {
    const pepper = configService.get<string>('AUTH_CODE_PEPPER');
    if (!pepper) {
      throw new Error('AUTH_CODE_PEPPER is not configured');
    }
    this.codePepper = pepper;
    this.refreshTokenTtlDays = parseTtlDays(
      configService.get<string>('REFRESH_TOKEN_EXPIRES_IN_DAYS'),
    );
    this.reviewAccounts = parseReviewAccounts(configService.get<string>('REVIEW_ACCOUNTS'));
  }

  /** Review-account email → its fixed code, for `RequestSignInCode`. */
  get reviewCodes(): ReviewCodes {
    return Object.fromEntries(this.reviewAccounts.map((account) => [account.email, account.code]));
  }
}

function parseTtlDays(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_REFRESH_TOKEN_EXPIRES_IN_DAYS;
  }
  const days = Number(raw);
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error('REFRESH_TOKEN_EXPIRES_IN_DAYS must be a positive integer');
  }
  return days;
}
