import { ConfigService } from '@nestjs/config';
import { AuthConfig, parseReviewAccounts } from './auth.config.js';

const ACCOUNTS = [
  { email: ' Review.Admin@Example.com ', code: '246810', role: 'admin', name: ' Review Admin ' },
  { email: 'review.student@example.com', code: '135791', role: 'student', name: 'Review Student' },
];

function config(env: Record<string, string>) {
  return new AuthConfig(new ConfigService({ AUTH_CODE_PEPPER: 'pepper', ...env }));
}

describe('AuthConfig', () => {
  it('refuses to start without AUTH_CODE_PEPPER', () => {
    expect(() => new AuthConfig(new ConfigService({}))).toThrow(
      'AUTH_CODE_PEPPER is not configured',
    );
  });

  it('exposes the pepper and defaults the refresh-token lifetime to 30 days', () => {
    const auth = config({});

    expect(auth.codePepper).toBe('pepper');
    expect(auth.refreshTokenTtlDays).toBe(30);
    expect(auth.reviewAccounts).toEqual([]);
    expect(auth.reviewCodes).toEqual({});
  });

  it('reads REFRESH_TOKEN_EXPIRES_IN_DAYS', () => {
    expect(config({ REFRESH_TOKEN_EXPIRES_IN_DAYS: '7' }).refreshTokenTtlDays).toBe(7);
    expect(config({ REFRESH_TOKEN_EXPIRES_IN_DAYS: ' ' }).refreshTokenTtlDays).toBe(30);
  });

  it.each(['0', '-1', '1.5', 'abc'])('rejects REFRESH_TOKEN_EXPIRES_IN_DAYS=%s', (value) => {
    expect(() => config({ REFRESH_TOKEN_EXPIRES_IN_DAYS: value })).toThrow(
      'REFRESH_TOKEN_EXPIRES_IN_DAYS must be a positive integer',
    );
  });

  it('exposes the review accounts, normalized, and their codes by email', () => {
    const auth = config({ REVIEW_ACCOUNTS: JSON.stringify(ACCOUNTS) });

    expect(auth.reviewAccounts).toEqual([
      { email: 'review.admin@example.com', code: '246810', role: 'admin', name: 'Review Admin' },
      {
        email: 'review.student@example.com',
        code: '135791',
        role: 'student',
        name: 'Review Student',
      },
    ]);
    expect(auth.reviewCodes).toEqual({
      'review.admin@example.com': '246810',
      'review.student@example.com': '135791',
    });
  });

  it('refuses to start with a malformed REVIEW_ACCOUNTS', () => {
    expect(() => config({ REVIEW_ACCOUNTS: '{nope' })).toThrow('REVIEW_ACCOUNTS is not valid JSON');
  });
});

describe('parseReviewAccounts', () => {
  const entry = ACCOUNTS[1]!;
  const parse = (value: unknown) => () => parseReviewAccounts(JSON.stringify(value));

  it('returns no accounts when unset or blank', () => {
    expect(parseReviewAccounts(undefined)).toEqual([]);
    expect(parseReviewAccounts('  ')).toEqual([]);
    expect(parseReviewAccounts('[]')).toEqual([]);
  });

  it('rejects invalid JSON and anything that is not an array', () => {
    expect(() => parseReviewAccounts('not json')).toThrow('REVIEW_ACCOUNTS is not valid JSON');
    expect(parse({ email: 'a@b.com' })).toThrow('REVIEW_ACCOUNTS must be a JSON array');
  });

  it('rejects an entry that is not an object', () => {
    expect(parse(['x'])).toThrow('REVIEW_ACCOUNTS[0] is not an object');
    expect(parse([null])).toThrow('REVIEW_ACCOUNTS[0] is not an object');
  });

  it('rejects an invalid email', () => {
    expect(parse([{ ...entry, email: 'review@' }])).toThrow('REVIEW_ACCOUNTS[0] has an invalid email');
    expect(parse([{ ...entry, email: 42 }])).toThrow('has an invalid email');
  });

  it('rejects a code that is not 6 digits', () => {
    expect(parse([entry, { ...entry, email: 'x@example.com', code: '12345' }])).toThrow(
      'REVIEW_ACCOUNTS[1] has a code that is not 6 digits',
    );
    expect(parse([{ ...entry, code: '12345a' }])).toThrow('not 6 digits');
    expect(parse([{ ...entry, code: 246810 }])).toThrow('not 6 digits');
  });

  it('rejects an unknown role', () => {
    expect(parse([{ ...entry, role: 'owner' }])).toThrow('REVIEW_ACCOUNTS[0] has an unknown role');
  });

  it('rejects a missing name', () => {
    expect(parse([{ ...entry, name: ' ' }])).toThrow('REVIEW_ACCOUNTS[0] has no name');
    expect(parse([{ ...entry, name: undefined }])).toThrow('has no name');
  });

  it('rejects the same email twice', () => {
    expect(parse([entry, { ...entry, email: 'REVIEW.student@example.com' }])).toThrow(
      'REVIEW_ACCOUNTS has the same email twice',
    );
  });
});
