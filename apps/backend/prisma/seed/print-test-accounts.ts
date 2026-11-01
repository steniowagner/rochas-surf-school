import { buildTestAccounts, formatTestAccounts } from './test-accounts.js';

// `TEST_ACCOUNTS_CODE=<6 digits> npm run test-accounts`: prints the `REVIEW_ACCOUNTS` value of the 12 test sets, with
// that sign-in code, and their hand-out table.
const { env, table } = formatTestAccounts(buildTestAccounts(process.env.TEST_ACCOUNTS_CODE));

console.log(env);
console.log('');
console.log(table);
