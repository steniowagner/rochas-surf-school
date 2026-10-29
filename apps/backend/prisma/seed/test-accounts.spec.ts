import { PersonNameRule } from '@rochas-surf-school/shared';

import { parseReviewAccounts } from '../../src/modules/auth/auth.config.js';
import { buildTestAccounts, formatTestAccounts } from './test-accounts.js';

const NUMBERS = [
  'Um',
  'Dois',
  'Três',
  'Quatro',
  'Cinco',
  'Seis',
  'Sete',
  'Oito',
  'Nove',
  'Dez',
  'Onze',
  'Doze',
];

describe('buildTestAccounts', () => {
  it('builds 36 accounts, 12 per role, with the emails and names of the 12 sets', () => {
    const accounts = buildTestAccounts();

    expect(accounts).toHaveLength(36);
    for (const role of ['admin', 'instructor', 'student']) {
      expect(accounts.filter((account) => account.role === role)).toHaveLength(12);
    }
    NUMBERS.forEach((number, index) => {
      const set = String(index + 1).padStart(2, '0');
      expect(accounts.slice(index * 3, index * 3 + 3)).toEqual([
        {
          email: `teste${set}.admin@rochas-surf-school.test`,
          code: expect.any(String),
          role: 'admin',
          name: `Admin Teste ${number}`,
        },
        {
          email: `teste${set}.instrutor@rochas-surf-school.test`,
          code: expect.any(String),
          role: 'instructor',
          name: `Instrutor Teste ${number}`,
        },
        {
          email: `teste${set}.aluno@rochas-surf-school.test`,
          code: expect.any(String),
          role: 'student',
          name: `Aluno Teste ${number}`,
        },
      ]);
    });
  });

  it('gives every account a name that passes PersonNameRule', () => {
    const rule = new PersonNameRule();

    for (const account of buildTestAccounts()) {
      expect(rule.validate(account.name)).toBeNull();
    }
  });

  it('gives distinct 6-digit codes', () => {
    const codes = buildTestAccounts().map((account) => account.code);

    expect(new Set(codes).size).toBe(36);
    for (const code of codes) expect(code).toMatch(/^\d{6}$/);
  });

  it('keeps the codes distinct when the random source repeats', () => {
    const sequence = ['000001', '000001', '000002', '000001', '000002', '000003'];
    let call = 0;
    const randomCode = () => sequence[call++] ?? String(call).padStart(6, '0');

    const codes = buildTestAccounts(randomCode).map((account) => account.code);

    expect(codes.slice(0, 3)).toEqual(['000001', '000002', '000003']);
    expect(new Set(codes).size).toBe(36);
  });

  it('changes the codes between runs but not the emails and names', () => {
    const first = buildTestAccounts();
    const second = buildTestAccounts();

    expect(second.map(({ email, name, role }) => ({ email, name, role }))).toEqual(
      first.map(({ email, name, role }) => ({ email, name, role })),
    );
    expect(second.map((account) => account.code)).not.toEqual(
      first.map((account) => account.code),
    );
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

  it('formats a Markdown table with one row per account, in set order', () => {
    const accounts = buildTestAccounts();

    const lines = formatTestAccounts(accounts).table.split('\n');

    expect(lines[0]).toBe('| Set | Role | Email | Code |');
    expect(lines[1]).toBe('| --- | --- | --- | --- |');
    expect(lines).toHaveLength(38);
    expect(lines[2]).toBe(`| 01 | admin | teste01.admin@rochas-surf-school.test | ${accounts[0].code} |`);
    expect(lines[4]).toBe(
      `| 01 | student | teste01.aluno@rochas-surf-school.test | ${accounts[2].code} |`,
    );
    expect(lines[37]).toBe(
      `| 12 | student | teste12.aluno@rochas-surf-school.test | ${accounts[35].code} |`,
    );
    accounts.forEach((account, index) => {
      expect(lines[index + 2]).toContain(`| ${account.email} | ${account.code} |`);
    });
  });
});
