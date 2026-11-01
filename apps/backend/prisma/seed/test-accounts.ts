import { testAccountCode, testAccountSets } from '@rochas-surf-school/shared';

import type { ReviewAccount } from '../../src/modules/auth/auth.config.js';

export interface FormattedTestAccounts {
  /** `REVIEW_ACCOUNTS='<JSON array>'`, ready for the server's environment. */
  env: string;
  /** The Markdown hand-out table: `| Set | Role | Email | Code |`, one row per account. */
  table: string;
}

/**
 * Builds the review accounts of the 12 test sets (`testAccountSets`, spec 076 D-21), in set order, all with
 * `testAccountCode`. Only the admins start approved: the others start as pending students, whatever the set calls them.
 */
export function buildTestAccounts(): ReviewAccount[] {
  const code = testAccountCode;

  return testAccountSets.flatMap(({ accounts }) =>
    accounts.map(({ email, role, name }) =>
      role === 'admin'
        ? { email, code, role, status: 'approved', name }
        : { email, code, role: 'student', status: 'pending', name },
    ),
  );
}

/** The `REVIEW_ACCOUNTS` line and the hand-out table for the given accounts, in their order. */
export function formatTestAccounts(accounts: ReviewAccount[]): FormattedTestAccounts {
  const env = `REVIEW_ACCOUNTS='${JSON.stringify(accounts)}'`;
  const rows = accounts.map((account) => {
    const set = account.email.split('@')[0].slice(-2);
    return `| ${set} | ${account.role} | ${account.email} | ${account.code} |`;
  });
  const table = ['| Set | Role | Email | Code |', '| --- | --- | --- | --- |', ...rows].join('\n');
  return { env, table };
}
