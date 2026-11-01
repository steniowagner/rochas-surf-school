import { PersonNameRule, testAccountCode, testAccountSets } from '@rochas-surf-school/shared';

import { parseReviewAccounts } from '../../src/modules/auth/auth.config.js';
import { buildTestAccounts, formatTestAccounts } from './test-accounts.js';

const CODE = testAccountCode;

const NUMBERS = [
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
];

describe('buildTestAccounts', () => {
  it('builds 36 accounts with the emails and names of the 12 sets', () => {
    const accounts = buildTestAccounts();

    expect(accounts).toHaveLength(36);
    NUMBERS.forEach((number, index) => {
      const set = String(index + 1).padStart(2, '0');
      expect(accounts.slice(index * 3, index * 3 + 3)).toEqual([
        {
          email: `admin${set}@test.com`,
          code: CODE,
          role: 'admin',
          status: 'approved',
          name: `Admin User ${number}`,
        },
        {
          email: `instructor${set}@test.com`,
          code: CODE,
          role: 'student',
          status: 'pending',
          name: `Instructor User ${number}`,
        },
        {
          email: `student${set}@test.com`,
          code: CODE,
          role: 'student',
          status: 'pending',
          name: `Student User ${number}`,
        },
      ]);
    });
  });

  it('approves only the admins and starts everyone else as a pending student', () => {
    const accounts = buildTestAccounts();

    expect(accounts.filter((account) => account.status === 'approved')).toHaveLength(12);
    expect(accounts.filter((account) => account.role === 'admin')).toHaveLength(12);
    expect(accounts.filter((account) => account.role === 'student')).toHaveLength(24);
    for (const account of accounts) {
      expect(account.status === 'approved').toBe(account.role === 'admin');
    }
  });

  it('mirrors the emails and names of testAccountSets', () => {
    const accounts = buildTestAccounts();

    expect(accounts.map(({ email, name }) => ({ email, name }))).toEqual(
      testAccountSets.flatMap((set) => set.accounts.map(({ email, name }) => ({ email, name }))),
    );
  });

  it('gives every account a name that passes PersonNameRule', () => {
    const rule = new PersonNameRule();

    for (const account of buildTestAccounts()) {
      expect(rule.validate(account.name)).toBeNull();
    }
  });

  it('gives every account the same code', () => {
    const codes = buildTestAccounts().map((account) => account.code);

    expect(new Set(codes)).toEqual(new Set([testAccountCode]));
  });
});

describe('formatTestAccounts', () => {
  it('formats a REVIEW_ACCOUNTS line that parseReviewAccounts accepts as the 36 accounts', () => {
    const accounts = buildTestAccounts();

    const { env } = formatTestAccounts(accounts);

    const match = /^REVIEW_ACCOUNTS='(.*)'$/.exec(env);
    expect(match).not.toBeNull();
    expect(parseReviewAccounts(match![1])).toEqual(accounts);
  });

  it('keeps the REVIEW_ACCOUNTS value under the 4 KB of a standard SSM parameter', () => {
    const { env } = formatTestAccounts(buildTestAccounts());

    expect(Buffer.byteLength(/^REVIEW_ACCOUNTS='(.*)'$/.exec(env)![1])).toBeLessThan(4096);
  });

  it('formats a Markdown table with one row per account, in set order', () => {
    const accounts = buildTestAccounts();

    const lines = formatTestAccounts(accounts).table.split('\n');

    expect(lines[0]).toBe('| Set | Role | Email | Code |');
    expect(lines[1]).toBe('| --- | --- | --- | --- |');
    expect(lines).toHaveLength(38);
    expect(lines[2]).toBe(`| 01 | admin | admin01@test.com | ${CODE} |`);
    expect(lines[4]).toBe(`| 01 | student | student01@test.com | ${CODE} |`);
    expect(lines[37]).toBe(`| 12 | student | student12@test.com | ${CODE} |`);
    accounts.forEach((account, index) => {
      expect(lines[index + 2]).toContain(`| ${account.email} | ${account.code} |`);
    });
  });
});
