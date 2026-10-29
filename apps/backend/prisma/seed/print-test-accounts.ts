import { buildTestAccounts, formatTestAccounts } from './test-accounts.js';

// `npm run test-accounts`: prints a fresh `REVIEW_ACCOUNTS` value for the 12 test sets and their hand-out table.
const { env, table } = formatTestAccounts(buildTestAccounts());

console.log(env);
console.log('');
console.log(table);
