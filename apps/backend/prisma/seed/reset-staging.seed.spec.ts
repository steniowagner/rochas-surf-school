import { resetStagingSeed } from './reset-staging.seed.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';

const ACCOUNT = { email: 'admin01@test.com', code: '123456', role: 'admin', name: 'Admin User One' };
const env = { REVIEW_ACCOUNTS: JSON.stringify([ACCOUNT]) };

/** A stand-in for what the seed calls, recording the order of the calls. */
function fakePrisma(tables: string[] = ['users', 'rules_versions']) {
  const calls: string[] = [];
  const record = (name: string) => vi.fn(async () => void calls.push(name));
  const prisma = {
    $queryRaw: vi.fn(async () => tables.map((tablename) => ({ tablename }))),
    $executeRawUnsafe: record('truncate'),
    $transaction: vi.fn(async (steps: Promise<unknown>[]) => Promise.all(steps)),
    rulesVersion: { create: record('rulesVersion') },
    user: { upsert: vi.fn(async ({ create }) => (calls.push('user'), create)) },
    identity: { upsert: record('identity') },
  };
  return { prisma: prisma as unknown as PrismaClient, raw: prisma, calls };
}

describe('resetStagingSeed', () => {
  it('empties every table it finds, in one statement', async () => {
    const { prisma, raw } = fakePrisma(['users', 'classes']);

    await resetStagingSeed(prisma, env);

    expect(raw.$executeRawUnsafe).toHaveBeenCalledWith(
      'TRUNCATE TABLE "public"."users", "public"."classes" CASCADE',
    );
  });

  it('leaves the migrations history out of the tables to empty', async () => {
    const { prisma, raw } = fakePrisma();

    await resetStagingSeed(prisma, env);

    const [strings] = raw.$queryRaw.mock.calls[0] as unknown as [string[]];
    expect(strings.join('')).toContain("tablename <> '_prisma_migrations'");
  });

  it('puts back the rules version row, in the same transaction as the wipe', async () => {
    const { prisma, raw } = fakePrisma();

    await resetStagingSeed(prisma, env);

    expect(raw.rulesVersion.create).toHaveBeenCalledWith({
      data: { id: expect.any(String), version: 0 },
    });
    expect(raw.$transaction).toHaveBeenCalledTimes(1);
    expect(raw.$transaction.mock.calls[0][0]).toHaveLength(2);
  });

  it('seeds the accounts after the wipe', async () => {
    const { prisma, calls } = fakePrisma();

    await resetStagingSeed(prisma, env);

    expect(calls).toEqual(['truncate', 'rulesVersion', 'user', 'identity']);
  });

  it.each([{}, { REVIEW_ACCOUNTS: '' }, { REVIEW_ACCOUNTS: '[]' }])(
    'touches nothing without accounts to seed: %j',
    async (emptyEnv) => {
      const { prisma, raw } = fakePrisma();

      await expect(resetStagingSeed(prisma, emptyEnv)).rejects.toThrow(
        'REVIEW_ACCOUNTS has no accounts to seed',
      );
      expect(raw.$executeRawUnsafe).not.toHaveBeenCalled();
    },
  );

  it('touches nothing on a malformed REVIEW_ACCOUNTS', async () => {
    const { prisma, raw } = fakePrisma();

    await expect(resetStagingSeed(prisma, { REVIEW_ACCOUNTS: '{nope' })).rejects.toThrow(
      'REVIEW_ACCOUNTS is not valid JSON',
    );
    expect(raw.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('reads process.env by default', async () => {
    const { prisma, raw } = fakePrisma();
    vi.stubEnv('REVIEW_ACCOUNTS', env.REVIEW_ACCOUNTS);

    await resetStagingSeed(prisma);

    expect(raw.user.upsert).toHaveBeenCalledTimes(1);
    vi.unstubAllEnvs();
  });
});
