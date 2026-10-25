import { randomUUID } from 'node:crypto';

import type { PrismaClient } from '../../src/generated/prisma/client.js';

export const SAMPLE_INSTRUCTOR_EMAIL = 'instructor@example.com';
const SAMPLE_ADMIN_EMAIL = 'admin@example.com';
const LOCATION_ID = '5a1e0000-0000-4000-8000-000000000001';
const LOCATION_NAME_KEY = 'praia do futuro';

type SampleClass = {
  id: string;
  /** Days from today: negative for classes already taught. */
  day: number;
  /** The start, in UTC hours (Fortaleza is 3 hours behind). */
  hour: number;
  discipline: 'surf' | 'skate';
  level: 'beginner' | 'advanced' | 'expert';
  notes: string | null;
};

const classId = (n: number) => `5a1e0000-0000-4000-8000-0000000001${String(n).padStart(2, '0')}`;

const SAMPLE_CLASSES: SampleClass[] = [
  { id: classId(1), day: -14, hour: 11, discipline: 'surf', level: 'beginner', notes: null },
  { id: classId(2), day: -7, hour: 20, discipline: 'skate', level: 'beginner', notes: null },
  { id: classId(3), day: -3, hour: 11, discipline: 'surf', level: 'advanced', notes: null },
  { id: classId(4), day: 0, hour: 20, discipline: 'skate', level: 'advanced', notes: 'Bring your own helmet.' },
  { id: classId(5), day: 1, hour: 11, discipline: 'surf', level: 'beginner', notes: null },
  { id: classId(6), day: 2, hour: 14, discipline: 'surf', level: 'expert', notes: 'Small waves expected.' },
  { id: classId(7), day: 4, hour: 20, discipline: 'skate', level: 'beginner', notes: null },
  { id: classId(8), day: 7, hour: 11, discipline: 'surf', level: 'advanced', notes: null },
];

const startOfDayUtc = (now: Date, offsetDays: number) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays));

/**
 * Upserts a few sample classes taught by `instructor@example.com` (created as an approved instructor when missing):
 * some already taught, one today and some coming up, so the instructor's and the student's screens have something to
 * show. The dates are relative to `now` and the ids are fixed, so running it again moves the same classes. It never
 * runs in production.
 */
export async function sampleClassesSeed(
  prisma: PrismaClient,
  now: Date = new Date(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  if (env.NODE_ENV === 'production') {
    return;
  }

  const instructor = await upsertUser(prisma, SAMPLE_INSTRUCTOR_EMAIL, 'Instructor Example', 'instructor');
  const admin =
    (await prisma.user.findFirst({ where: { role: 'admin', status: 'approved' } })) ??
    (await upsertUser(prisma, SAMPLE_ADMIN_EMAIL, 'Admin Example', 'admin'));

  // By name, so a location the school already has with it is reused.
  const location = await prisma.location.upsert({
    where: { nameKey: LOCATION_NAME_KEY },
    create: {
      id: LOCATION_ID,
      name: 'Praia do Futuro',
      nameKey: LOCATION_NAME_KEY,
      address: 'Av. Zezé Diogo, Fortaleza - CE',
    },
    update: {},
  });

  for (const sample of SAMPLE_CLASSES) {
    const startsAt = startOfDayUtc(now, sample.day);
    startsAt.setUTCHours(sample.hour);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
    const fields = {
      discipline: sample.discipline,
      level: sample.level,
      startsAt,
      endsAt,
      locationId: location.id,
      capacity: 8,
      notes: sample.notes,
    };

    await prisma.schoolClass.upsert({
      where: { id: sample.id },
      create: { id: sample.id, createdBy: admin.id, ...fields },
      update: fields,
    });
    await prisma.classInstructor.upsert({
      where: { classId_userId: { classId: sample.id, userId: instructor.id } },
      create: { classId: sample.id, userId: instructor.id },
      update: {},
    });
  }
}

async function upsertUser(
  prisma: PrismaClient,
  email: string,
  name: string,
  role: 'instructor' | 'admin',
) {
  const user = await prisma.user.upsert({
    where: { email },
    create: { id: randomUUID(), email, name, role, status: 'approved' },
    update: {},
  });
  await prisma.identity.upsert({
    where: { provider_providerUserId: { provider: 'email', providerUserId: email } },
    create: { id: randomUUID(), userId: user.id, provider: 'email', providerUserId: email, email },
    update: {},
  });

  return user;
}
