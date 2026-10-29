import { randomInt } from 'node:crypto';

import type { ReviewAccount } from '../../src/modules/auth/auth.config.js';

const SET_NUMBERS = [
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

/** Each set's accounts, in hand-out order: the email's local suffix, the role and the name's first word. */
const SET_ROLES = [
  { suffix: 'admin', role: 'admin', title: 'Admin' },
  { suffix: 'instrutor', role: 'instructor', title: 'Instrutor' },
  { suffix: 'aluno', role: 'student', title: 'Aluno' },
] as const;

const EMAIL_DOMAIN = 'rochas-surf-school.test';

export interface FormattedTestAccounts {
  /** `REVIEW_ACCOUNTS='<JSON array>'`, ready for the server's environment. */
  env: string;
  /** The Markdown hand-out table: `| Set | Role | Email | Code |`, one row per account. */
  table: string;
}

const randomSixDigitCode = (): string => randomInt(0, 1_000_000).toString().padStart(6, '0');

/**
 * Builds the 12 test sets of spec 076 (D-21): per set an admin, an instructor and a student review account,
 * each with its own random 6-digit code. The codes are never committed (D-22): they exist only in this output.
 */
export function buildTestAccounts(randomCode: () => string = randomSixDigitCode): ReviewAccount[] {
  const usedCodes = new Set<string>();
  const nextCode = (): string => {
    let code = randomCode();
    while (usedCodes.has(code)) code = randomCode();
    usedCodes.add(code);
    return code;
  };

  return SET_NUMBERS.flatMap((number, index) => {
    const set = String(index + 1).padStart(2, '0');
    return SET_ROLES.map(({ suffix, role, title }) => ({
      email: `teste${set}.${suffix}@${EMAIL_DOMAIN}`,
      code: nextCode(),
      role,
      name: `${title} Teste ${number}`,
    }));
  });
}

/** The `REVIEW_ACCOUNTS` line and the hand-out table for the given accounts, in their order. */
export function formatTestAccounts(accounts: ReviewAccount[]): FormattedTestAccounts {
  const env = `REVIEW_ACCOUNTS='${JSON.stringify(accounts)}'`;
  const rows = accounts.map((account) => {
    const set = account.email.slice('teste'.length, 'teste'.length + 2);
    return `| ${set} | ${account.role} | ${account.email} | ${account.code} |`;
  });
  const table = ['| Set | Role | Email | Code |', '| --- | --- | --- | --- |', ...rows].join('\n');
  return { env, table };
}
