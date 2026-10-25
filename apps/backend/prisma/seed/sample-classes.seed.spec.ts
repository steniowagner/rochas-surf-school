import { sampleClassesSeed } from './sample-classes.seed.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';

const NOW = new Date('2026-10-15T12:00:00.000Z');

/** An in-memory stand-in for the Prisma delegates the seed uses, with upsert semantics. */
function fakePrisma(admin: { id: string } | null = null) {
  const users = new Map<string, { id: string; email: string; role: string; status: string }>();
  const classes = new Map<string, { id: string; startsAt: Date; createdBy: string }>();
  const instructors = new Map<string, { classId: string; userId: string }>();
  const prisma = {
    user: {
      upsert: vi.fn(async ({ where, create }) => {
        if (!users.has(where.email)) users.set(where.email, create);
        return users.get(where.email);
      }),
      findFirst: vi.fn(async () => admin),
    },
    identity: { upsert: vi.fn(async () => undefined) },
    location: { upsert: vi.fn(async () => ({ id: 'location-1' })) },
    schoolClass: {
      upsert: vi.fn(async ({ where, create, update }) => {
        const current = classes.get(where.id);
        classes.set(where.id, current ? { ...current, ...update } : create);
      }),
    },
    classInstructor: {
      upsert: vi.fn(async ({ where, create }) => {
        const { classId, userId } = where.classId_userId;
        instructors.set(`${classId}:${userId}`, create);
      }),
    },
  };

  return { prisma: prisma as unknown as PrismaClient, users, classes, instructors };
}

describe('sampleClassesSeed', () => {
  it('teaches every sample class with instructor@example.com, created as an approved instructor', async () => {
    const { prisma, users, classes, instructors } = fakePrisma({ id: 'admin-1' });

    await sampleClassesSeed(prisma, NOW, {});

    const instructor = users.get('instructor@example.com');
    expect(instructor).toEqual(expect.objectContaining({ role: 'instructor', status: 'approved' }));
    expect(classes.size).toBeGreaterThan(0);
    expect([...instructors.values()].map((link) => link.userId)).toEqual(
      [...classes.keys()].map(() => instructor?.id),
    );
    expect([...classes.values()].every((item) => item.createdBy === 'admin-1')).toBe(true);
  });

  it('has classes already taught, one today and some coming up', async () => {
    const { prisma, classes } = fakePrisma({ id: 'admin-1' });

    await sampleClassesSeed(prisma, NOW, {});

    const starts = [...classes.values()].map((item) => item.startsAt);
    expect(starts.some((start) => start < NOW)).toBe(true);
    expect(starts.some((start) => start > NOW)).toBe(true);
    expect(starts.some((start) => start.toISOString().startsWith('2026-10-15'))).toBe(true);
  });

  it('creates an admin to own the classes when there is none', async () => {
    const { prisma, users } = fakePrisma(null);

    await sampleClassesSeed(prisma, NOW, {});

    expect(users.get('admin@example.com')).toEqual(expect.objectContaining({ role: 'admin' }));
  });

  it('moves the same classes when run again', async () => {
    const { prisma, classes, instructors } = fakePrisma({ id: 'admin-1' });

    await sampleClassesSeed(prisma, NOW, {});
    const ids = [...classes.keys()];
    await sampleClassesSeed(prisma, new Date('2026-10-20T12:00:00.000Z'), {});

    expect([...classes.keys()]).toEqual(ids);
    expect(instructors.size).toBe(ids.length);
  });

  it('does nothing in production', async () => {
    const { prisma, users, classes } = fakePrisma({ id: 'admin-1' });

    await sampleClassesSeed(prisma, NOW, { NODE_ENV: 'production' });

    expect(users.size).toBe(0);
    expect(classes.size).toBe(0);
  });
});
