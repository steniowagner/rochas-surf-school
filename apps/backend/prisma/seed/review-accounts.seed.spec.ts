import { reviewAccountsSeed } from './review-accounts.seed.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';

const ACCOUNTS = [
  {
    email: ' Review.Student@Example.com ',
    code: '135791',
    role: 'student',
    name: 'Review Student',
  },
  {
    email: 'review.instructor@example.com',
    code: '246802',
    role: 'instructor',
    name: 'Review Instructor',
  },
  {
    email: 'review.admin@example.com',
    code: '246810',
    role: 'admin',
    name: 'Review Admin',
  },
];

/** An in-memory stand-in for the two Prisma delegates the seed uses, with upsert semantics. */
function fakePrisma() {
  const users = new Map<
    string,
    { id: string; email: string; name: string; role: string; status: string }
  >();
  const identities = new Map<
    string,
    { id: string; userId: string; provider: string; providerUserId: string }
  >();
  const prisma = {
    user: {
      upsert: vi.fn(async ({ where, create, update }) => {
        const current = users.get(where.email);
        const next = current ? { ...current, ...update } : create;
        users.set(where.email, next);
        return next;
      }),
    },
    identity: {
      upsert: vi.fn(async ({ where, create }) => {
        const key = `${where.provider_providerUserId.provider}:${where.provider_providerUserId.providerUserId}`;
        if (!identities.has(key)) identities.set(key, create);
        return identities.get(key);
      }),
    },
  };
  return {
    prisma: prisma as unknown as PrismaClient,
    users,
    identities,
    raw: prisma,
  };
}

describe('reviewAccountsSeed', () => {
  it('creates one approved account with an email identity per review account', async () => {
    const { prisma, users, identities } = fakePrisma();

    await reviewAccountsSeed(prisma, {
      REVIEW_ACCOUNTS: JSON.stringify(ACCOUNTS),
    });

    expect([...users.values()]).toEqual([
      expect.objectContaining({
        email: 'review.student@example.com',
        name: 'Review Student',
        role: 'student',
        status: 'approved',
      }),
      expect.objectContaining({
        email: 'review.instructor@example.com',
        name: 'Review Instructor',
        role: 'instructor',
        status: 'approved',
      }),
      expect.objectContaining({
        email: 'review.admin@example.com',
        name: 'Review Admin',
        role: 'admin',
        status: 'approved',
      }),
    ]);
    expect([...identities.values()]).toEqual(
      [...users.values()].map((user) =>
        expect.objectContaining({
          userId: user.id,
          provider: 'email',
          providerUserId: user.email,
          email: user.email,
        }),
      ),
    );
  });

  it('leaves exactly three accounts and three identities when run twice', async () => {
    const { prisma, users, identities } = fakePrisma();
    const env = { REVIEW_ACCOUNTS: JSON.stringify(ACCOUNTS) };

    await reviewAccountsSeed(prisma, env);
    const ids = [...users.values()].map((user) => user.id);
    await reviewAccountsSeed(prisma, env);

    expect(users.size).toBe(3);
    expect(identities.size).toBe(3);
    expect([...users.values()].map((user) => user.id)).toEqual(ids);
  });

  it('brings an existing account back to the configured name, role and approved status', async () => {
    const { prisma, raw } = fakePrisma();

    await reviewAccountsSeed(prisma, {
      REVIEW_ACCOUNTS: JSON.stringify([ACCOUNTS[2]]),
    });

    expect(raw.user.upsert).toHaveBeenCalledWith({
      where: { email: 'review.admin@example.com' },
      create: expect.objectContaining({
        email: 'review.admin@example.com',
        status: 'approved',
      }),
      update: { name: 'Review Admin', role: 'admin', status: 'approved' },
    });
    expect(raw.identity.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: {} }),
    );
  });

  it('creates nothing and succeeds when REVIEW_ACCOUNTS is unset', async () => {
    const { prisma, raw } = fakePrisma();

    await expect(reviewAccountsSeed(prisma, {})).resolves.toBeUndefined();
    expect(raw.user.upsert).not.toHaveBeenCalled();
  });

  it('fails on a malformed REVIEW_ACCOUNTS, through the same parser as the backend', async () => {
    const { prisma } = fakePrisma();

    await expect(
      reviewAccountsSeed(prisma, { REVIEW_ACCOUNTS: '[{"email":"x"}]' }),
    ).rejects.toThrow('REVIEW_ACCOUNTS[0] has an invalid email');
  });

  it('reads process.env by default', async () => {
    const { prisma, raw } = fakePrisma();
    vi.stubEnv('REVIEW_ACCOUNTS', JSON.stringify([ACCOUNTS[0]]));

    await reviewAccountsSeed(prisma);

    expect(raw.user.upsert).toHaveBeenCalledTimes(1);
    vi.unstubAllEnvs();
  });
});
