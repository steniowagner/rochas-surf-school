import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/db/prisma.service.js';
import { JwtTokenProvider } from '../src/modules/auth/jwt.token.js';
import { SystemClockProvider as ClassesClockProvider } from '../src/modules/classes/system.clock.js';
import { GuestErasureJob } from '../src/modules/enrolment/guest-erasure.job.js';
import { SystemClockProvider as EnrolmentClockProvider } from '../src/modules/enrolment/system.clock.js';

// Secrets the backend refuses to start without; CI has no .env.
process.env.AUTH_CODE_PEPPER ??= 'e2e-pepper';
process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';

const DOMAIN = 'guests.e2e.example.com';
const MARK = 'e2eguests';
// Wednesday 2026-10-14, 10:00 in Fortaleza.
const NOW = new Date('2026-10-14T13:00:00.000Z');
// Tomorrow 08:00-09:00 in Fortaleza.
const STARTS_AT = '2026-10-15T11:00:00.000Z';
const ENDS_AT = '2026-10-15T12:00:00.000Z';
const DAY = 24 * 60 * 60 * 1000;
const GUEST = { name: 'Carolina Reis', whatsappNumber: '+5585999990000' };

type Role = 'student' | 'instructor' | 'admin';
type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';

const NOT_APPROVED: Status[] = ['pending', 'denied', 'deleted', 'removed'];

interface Account {
  id: string;
  accessToken: string;
}

describe('Trial guests (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: JwtTokenProvider;
  let now: Date;
  let locationId: string;

  beforeEach(async () => {
    now = NOW;
    const moduleRef = await Test.createTestingModule({
      imports: [(await import('../src/app.module.js')).AppModule],
    })
      .overrideProvider(ClassesClockProvider)
      .useValue({ now: () => new Date(now.getTime()) })
      .overrideProvider(EnrolmentClockProvider)
      .useValue({ now: () => new Date(now.getTime()) })
      .compile();
    app = moduleRef.createNestApplication<INestApplication<App>>();
    await app.init();
    prisma = app.get(PrismaService);
    tokens = app.get(JwtTokenProvider, { strict: false });
    locationId = (
      await prisma.location.create({
        data: {
          id: randomUUID(),
          name: `${MARK} ${randomUUID().slice(0, 8)}`,
          nameKey: `${MARK} ${randomUUID()}`,
          address: 'Av. Beira Mar',
        },
      })
    ).id;
  });

  afterEach(async () => {
    // Classes go first: their guests and enrolments cascade, and the students are restricted by them.
    await prisma.schoolClass.deleteMany({ where: { creator: { email: { endsWith: `@${DOMAIN}` } } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: MARK } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const as = (token: string | undefined, req: request.Test) =>
    token === undefined ? req : req.set('Authorization', `Bearer ${token}`);

  async function account(role: Role = 'admin', status: Status = 'approved'): Promise<Account> {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: `Person ${role}`,
        email: `u.${randomUUID().slice(0, 8)}@${DOMAIN}`,
        role,
        status,
      },
    });
    return { id: user.id, accessToken: tokens.signAccessToken({ id: user.id, email: user.email! }).token };
  }

  async function makeClass(
    creatorId: string,
    overrides: {
      startsAt?: string;
      endsAt?: string;
      capacity?: number;
      cancelledAt?: Date;
      instructorIds?: string[];
    } = {},
  ) {
    const id = randomUUID();
    await prisma.schoolClass.create({
      data: {
        id,
        discipline: 'surf',
        level: 'beginner',
        startsAt: new Date(overrides.startsAt ?? STARTS_AT),
        endsAt: new Date(overrides.endsAt ?? ENDS_AT),
        locationId,
        capacity: overrides.capacity ?? 8,
        createdBy: creatorId,
        cancelledAt: overrides.cancelledAt ?? null,
        instructors: { create: (overrides.instructorIds ?? []).map((userId) => ({ userId })) },
      },
    });
    return id;
  }

  async function seedEnrolment(classId: string, studentId: string, status: 'pending' | 'approved') {
    const id = randomUUID();
    await prisma.enrolment.create({
      data: {
        id,
        classId,
        studentId,
        status,
        requestedAt: new Date('2026-10-13T12:00:00.000Z'),
        decidedAt: status === 'approved' ? new Date('2026-10-13T13:00:00.000Z') : null,
      },
    });
    return id;
  }

  async function seedGuest(classId: string, name: string | null = GUEST.name) {
    const id = randomUUID();
    await prisma.guest.create({
      data: { id, classId, name, whatsappNumber: name ? GUEST.whatsappNumber : null, erasedAt: name ? null : NOW },
    });
    return id;
  }

  const addGuest = (token: string | undefined, classId: string, body: Record<string, unknown> = GUEST) =>
    as(token, http().post(`/classes/${classId}/guests`)).send(body);
  const removeGuest = (token: string | undefined, id: string) => as(token, http().delete(`/guests/${id}`));
  const details = (token: string, classId: string) => as(token, http().get(`/classes/${classId}`));
  const errorsOf = (response: request.Response) => [response.status, response.body.errors];

  describe('adds a guest', () => {
    it('stores the guest, answers it and takes a seat', async () => {
      const admin = await account();
      const classId = await makeClass(admin.id, { capacity: 2 });

      const response = await addGuest(admin.accessToken, classId);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ id: expect.any(String), classId, name: 'Carolina Reis' });
      expect(await prisma.guest.findUniqueOrThrow({ where: { id: response.body.id } })).toMatchObject({
        classId,
        name: 'Carolina Reis',
        whatsappNumber: '+5585999990000',
        createdBy: admin.id,
        erasedAt: null,
      });
      expect((await details(admin.accessToken, classId)).body.seatsTaken).toBe(1);
    });

    it('counts the guests against the capacity together with the approved students', async () => {
      const admin = await account();
      const student = await account('student');
      const classId = await makeClass(admin.id, { capacity: 2 });
      await seedEnrolment(classId, student.id, 'approved');

      expect((await addGuest(admin.accessToken, classId)).status).toBe(201);
      expect(errorsOf(await addGuest(admin.accessToken, classId))).toEqual([409, ['enrolment.class.full']]);
      expect(await prisma.guest.count({ where: { classId } })).toBe(1);
    });

    it('reports a missing or invalid name and number together', async () => {
      const admin = await account();
      const classId = await makeClass(admin.id);

      const response = await addGuest(admin.accessToken, classId, { whatsappNumber: '85999990000' });

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(
        expect.arrayContaining(['guest.name.required', 'guest.whatsappNumber.invalid']),
      );
      expect(errorsOf(await addGuest(admin.accessToken, classId, {}))[0]).toBe(422);
      expect(await prisma.guest.count({ where: { classId } })).toBe(0);
    });

    it('refuses a class that is missing, cancelled or started', async () => {
      const admin = await account();
      const cancelled = await makeClass(admin.id, { cancelledAt: NOW });
      const started = await makeClass(admin.id, {
        startsAt: '2026-10-14T12:00:00.000Z',
        endsAt: '2026-10-14T14:00:00.000Z',
      });

      expect(errorsOf(await addGuest(admin.accessToken, randomUUID()))).toEqual([404, ['class.notFound']]);
      expect(errorsOf(await addGuest(admin.accessToken, 'not-a-uuid'))).toEqual([404, ['class.notFound']]);
      expect(errorsOf(await addGuest(admin.accessToken, cancelled))).toEqual([409, ['class.cancelled']]);
      expect(errorsOf(await addGuest(admin.accessToken, started))).toEqual([409, ['class.started']]);
      expect(await prisma.guest.count({ where: { classId: { in: [cancelled, started] } } })).toBe(0);
    });

    it('answers 403 to anyone but an approved admin and 401 without a token', async () => {
      const admin = await account();
      const classId = await makeClass(admin.id);
      const instructor = await account('instructor');

      expect(errorsOf(await addGuest((await account('student')).accessToken, classId))).toEqual([
        403,
        ['user.role.notAdmin'],
      ]);
      expect(errorsOf(await addGuest(instructor.accessToken, classId))).toEqual([403, ['user.role.notAdmin']]);
      for (const status of NOT_APPROVED) {
        expect(errorsOf(await addGuest((await account('admin', status)).accessToken, classId))[0]).toBe(403);
      }
      expect((await addGuest(undefined, classId)).status).toBe(401);
      expect(await prisma.guest.count({ where: { classId } })).toBe(0);
    });

    it('leaves one winner when a guest and an approval take the last seat together', async () => {
      const admin = await account();
      const waiting = await account('student');
      const classId = await makeClass(admin.id, { capacity: 1 });
      const enrolmentId = await seedEnrolment(classId, waiting.id, 'pending');

      const [guest, approval] = await Promise.all([
        addGuest(admin.accessToken, classId),
        as(admin.accessToken, http().post(`/enrolments/${enrolmentId}/approve`)),
      ]);

      // Exactly one takes the seat: a 201 guest and a 409 refused approval, or a 200 approval and a 409 refused guest.
      expect(guest.status === 201 ? [guest.status, approval.status] : [approval.status, guest.status]).toEqual(
        guest.status === 201 ? [201, 409] : [200, 409],
      );
      expect(approval.status === 409 ? approval.body.errors : guest.body.errors).toEqual(['enrolment.class.full']);
      expect((await details(admin.accessToken, classId)).body.seatsTaken).toBe(1);
    });
  });

  describe('visibility', () => {
    async function classWithGuest() {
      const admin = await account();
      const instructor = await account('instructor');
      const other = await account('instructor');
      const student = await account('student');
      const classId = await makeClass(admin.id, { instructorIds: [instructor.id], capacity: 4 });
      const guestId = await seedGuest(classId);
      await seedGuest(classId, null);
      return { admin, instructor, other, student, classId, guestId };
    }

    it('shows the name to an admin and to the class instructors, "Trial" (a null name) to everyone else', async () => {
      const { admin, instructor, other, student, classId, guestId } = await classWithGuest();

      for (const who of [admin, instructor]) {
        const body = (await details(who.accessToken, classId)).body;

        expect(body.guests).toEqual(
          expect.arrayContaining([{ id: guestId, name: 'Carolina Reis' }, { id: expect.any(String), name: null }]),
        );
        expect(body.seatsTaken).toBe(2);
      }
      for (const who of [student, other]) {
        const body = (await details(who.accessToken, classId)).body;

        expect(body.guests).toEqual([
          { id: expect.any(String), name: null },
          { id: expect.any(String), name: null },
        ]);
        expect(body.seatsTaken).toBe(2);
      }
    });

    it('follows the same rule on the week list, and a class without guests reads none', async () => {
      const { admin, student, classId } = await classWithGuest();
      const empty = await makeClass(admin.id);
      const itemOf = async (token: string, id: string) =>
        (await as(token, http().get('/classes?date=2026-10-15'))).body.items.find((item: { id: string }) => item.id === id);

      expect((await itemOf(admin.accessToken, classId)).guests.map((guest: { name: string | null }) => guest.name).sort()).toEqual(
        ['Carolina Reis', null],
      );
      expect((await itemOf(student.accessToken, classId)).guests.every((guest: { name: unknown }) => guest.name === null)).toBe(true);
      expect((await itemOf(admin.accessToken, empty)).guests).toEqual([]);
    });

    it('refuses to delete a class with a guest and to lower its capacity below the seats taken', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const classId = await makeClass(admin.id, { capacity: 4, instructorIds: [instructor.id] });
      await seedGuest(classId);
      await seedGuest(classId);

      const deleted = await as(admin.accessToken, http().delete(`/classes/${classId}`));
      const edited = await as(admin.accessToken, http().put(`/classes/${classId}`)).send({
        discipline: 'surf',
        level: 'beginner',
        date: '2026-10-15',
        start: '08:00',
        end: '09:00',
        locationId,
        instructorIds: [instructor.id],
        capacity: 1,
      });

      expect(errorsOf(deleted)).toEqual([409, ['class.delete.notEmpty']]);
      expect(errorsOf(edited)).toEqual([422, ['class.capacity.belowSeatsTaken']]);
      expect(await prisma.guest.count({ where: { classId } })).toBe(2);
    });
  });

  describe('removes a guest', () => {
    it('answers 204 and frees the seat', async () => {
      const admin = await account();
      const classId = await makeClass(admin.id, { capacity: 1 });
      const guestId = await seedGuest(classId);

      const response = await removeGuest(admin.accessToken, guestId);

      expect(response.status).toBe(204);
      expect(await prisma.guest.count({ where: { id: guestId } })).toBe(0);
      expect((await details(admin.accessToken, classId)).body.seatsTaken).toBe(0);
      expect((await addGuest(admin.accessToken, classId)).status).toBe(201);
    });

    it('answers 404 for a missing guest and 409 once the class started', async () => {
      const admin = await account();
      const classId = await makeClass(admin.id);
      const guestId = await seedGuest(classId);

      expect(errorsOf(await removeGuest(admin.accessToken, randomUUID()))).toEqual([404, ['guest.notFound']]);
      expect(errorsOf(await removeGuest(admin.accessToken, 'not-a-uuid'))).toEqual([404, ['guest.notFound']]);
      now = new Date('2026-10-15T11:30:00.000Z');
      expect(errorsOf(await removeGuest(admin.accessToken, guestId))).toEqual([409, ['class.started']]);
      expect(await prisma.guest.count({ where: { id: guestId } })).toBe(1);
    });

    it('answers 403 to anyone but an approved admin and 401 without a token', async () => {
      const admin = await account();
      const classId = await makeClass(admin.id);
      const guestId = await seedGuest(classId);
      const instructor = await account('instructor');

      expect(errorsOf(await removeGuest((await account('student')).accessToken, guestId))[0]).toBe(403);
      expect(errorsOf(await removeGuest(instructor.accessToken, guestId))[0]).toBe(403);
      expect(errorsOf(await removeGuest((await account('admin', 'pending')).accessToken, guestId))[0]).toBe(403);
      expect((await removeGuest(undefined, guestId)).status).toBe(401);
      expect(await prisma.guest.count({ where: { id: guestId } })).toBe(1);
    });
  });

  describe('erasure', () => {
    it('erases the name and number 30 days after the class ended or was cancelled, once', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const ended = await makeClass(admin.id, {
        startsAt: new Date(NOW.getTime() - 30 * DAY - 3600_000).toISOString(),
        endsAt: new Date(NOW.getTime() - 30 * DAY).toISOString(),
        instructorIds: [instructor.id],
      });
      const cancelled = await makeClass(admin.id, { cancelledAt: new Date(NOW.getTime() - 30 * DAY) });
      const recent = await makeClass(admin.id, {
        startsAt: new Date(NOW.getTime() - 29 * DAY - 3600_000).toISOString(),
        endsAt: new Date(NOW.getTime() - 29 * DAY).toISOString(),
      });
      const [endedGuest, cancelledGuest, recentGuest] = [
        await seedGuest(ended),
        await seedGuest(cancelled),
        await seedGuest(recent),
      ];
      const job = app.get(GuestErasureJob);

      expect(await job.run()).toEqual({ erased: 2 });

      for (const id of [endedGuest, cancelledGuest]) {
        expect(await prisma.guest.findUniqueOrThrow({ where: { id } })).toMatchObject({
          name: null,
          whatsappNumber: null,
          erasedAt: NOW,
        });
      }
      expect(await prisma.guest.findUniqueOrThrow({ where: { id: recentGuest } })).toMatchObject({
        name: 'Carolina Reis',
        erasedAt: null,
      });
      // The seat reads "Trial" for everyone, the admin and the class instructor included.
      for (const who of [admin, instructor]) {
        expect((await details(who.accessToken, ended)).body.guests).toEqual([{ id: endedGuest, name: null }]);
      }
      expect(await job.run()).toEqual({ erased: 0 });
    });
  });
});
