import { randomInt } from 'node:crypto';

import { testAccountSets } from '@rochas-surf-school/shared';

import type { ReviewAccount } from '../../src/modules/auth/auth.config.js';

export interface FormattedTestAccounts {
  /** `REVIEW_ACCOUNTS='<JSON array>'`, ready for the server's environment. */
  env: string;
  /** The Markdown hand-out table: `| Set | Role | Email | Code |`, one row per account. */
  table: string;
}

const randomSixDigitCode = (): string => randomInt(0, 1_000_000).toString().padStart(6, '0');

/**
 * Builds the review accounts of the 12 test sets (`testAccountSets`, spec 076 D-21), in set order, each with its
 * own random 6-digit code. The codes are never committed (D-22): they exist only in this output.
 */
export function buildTestAccounts(randomCode: () => string = randomSixDigitCode): ReviewAccount[] {
  const usedCodes = new Set<string>();
  const nextCode = (): string => {
    let code = randomCode();
    while (usedCodes.has(code)) code = randomCode();
    usedCodes.add(code);
    return code;
  };

  return testAccountSets.flatMap(({ accounts }) =>
    accounts.map(({ email, role, name }) => ({ email, code: nextCode(), role, name })),
  );
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
