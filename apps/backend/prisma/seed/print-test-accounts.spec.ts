import { parseReviewAccounts } from '../../src/modules/auth/auth.config.js';

describe('print-test-accounts', () => {
  it('prints the REVIEW_ACCOUNTS line and the hand-out table', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.stubEnv('TEST_ACCOUNTS_CODE', '123456');

    await import('./print-test-accounts.js');

    const printed = log.mock.calls.map(([line]) => String(line));
    log.mockRestore();
    vi.unstubAllEnvs();
    expect(printed).toHaveLength(3);
    const [env, blank, table] = printed;
    const accounts = parseReviewAccounts(/^REVIEW_ACCOUNTS='(.*)'$/.exec(env)![1]);
    expect(accounts).toHaveLength(36);
    expect(accounts[0].code).toBe('123456');
    expect(blank).toBe('');
    const rows = table.split('\n');
    expect(rows[0]).toBe('| Set | Role | Email | Code |');
    expect(rows).toHaveLength(38);
    accounts.forEach((account, index) => {
      expect(rows[index + 2]).toContain(`| ${account.email} | ${account.code} |`);
    });
  });
});
