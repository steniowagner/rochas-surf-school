import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { PushMessage, PushReceipt, PushSendTicket } from '@rochas-surf-school/notifications';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/db/prisma.service.js';
import { JwtTokenProvider } from '../src/modules/auth/jwt.token.js';
import { GooglePlacesAddressSuggestionProvider } from '../src/modules/classes/google-places.address-suggestions.js';
import { SystemClockProvider } from '../src/modules/classes/system.clock.js';
import { ExpoPushProvider } from '../src/modules/notifications/expo.push.js';
import { renderPush } from '../src/modules/notifications/push-messages.js';

// Secrets the backend refuses to start without; CI has no .env.
process.env.AUTH_CODE_PEPPER ??= 'e2e-pepper';
process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';

const DOMAIN = 'locations.e2e.example.com';
// Every location this suite creates starts with this mark, so it can delete them without touching real ones.
const MARK = 'e2eloc';
const ADDRESS = 'Av. Zezé Diogo, 5000 – Fortaleza';
const POINT = { latitude: -3.7442, longitude: -38.4617 };
// Sunday 2037-10-18 (a year no real class is in, so the deadline job never meets these classes), 09:00 in Fortaleza.
const NOW = new Date('2037-10-18T12:00:00.000Z');
const TOMORROW = new Date('2037-10-19T11:00:00.000Z');
const YESTERDAY = new Date('2037-10-17T11:00:00.000Z');
const DEADLINE = new Date('2037-10-18T23:00:00.000Z');

type Role = 'student' | 'instructor' | 'admin';
type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';

const NOT_APPROVED: Status[] = ['pending', 'denied', 'deleted', 'removed'];

interface LocationBody {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  upcomingClasses: number;
}

/** Records the pushes instead of calling Expo. */
class FakePushProvider {
  sent: PushMessage[] = [];
  failing = false;

  async send(messages: PushMessage[]): Promise<PushSendTicket[]> {
    this.sent.push(...messages);
    if (this.failing) {
      throw new Error('expo unavailable');
    }
    return messages.map(() => ({ status: 'ok', id: `ticket-${randomUUID()}` }));
  }

  async getReceipts(): Promise<Record<string, PushReceipt>> {
    return {};
  }
}

/** Answers what the test sets instead of calling Google. */
class FakeAddressSuggestions {
  calls: { method: string; args: unknown }[] = [];
  items = [{ placeId: 'p1', title: 'Praia do Futuro', description: 'Fortaleza - CE' }];
  place: { address: string; latitude: number; longitude: number; name: string } | null = {
    address: ADDRESS,
    ...POINT,
    name: 'Praia do Futuro',
  };
  failing = false;

  async suggest(args: unknown) {
    this.calls.push({ method: 'suggest', args });
    if (this.failing) throw new Error('google unavailable');
    return this.items;
  }

  async findPlace(args: unknown) {
    this.calls.push({ method: 'findPlace', args });
    if (this.failing) throw new Error('google unavailable');
    return this.place;
  }
}

describe('Locations (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: JwtTokenProvider;
  let tag: string;
  let push: FakePushProvider;
  let google: FakeAddressSuggestions;

  beforeAll(async () => {
    push = new FakePushProvider();
    google = new FakeAddressSuggestions();
    const moduleRef = await Test.createTestingModule({
      imports: [(await import('../src/app.module.js')).AppModule],
    })
      .overrideProvider(ExpoPushProvider)
      .useValue(push)
      .overrideProvider(GooglePlacesAddressSuggestionProvider)
      .useValue(google)
      .overrideProvider(SystemClockProvider)
      .useValue({ now: () => new Date(NOW.getTime()) })
      .compile();
    app = moduleRef.createNestApplication<INestApplication<App>>();
    await app.init();
    prisma = app.get(PrismaService);
    tokens = app.get(JwtTokenProvider, { strict: false });
  });

  beforeEach(() => {
    push.sent = [];
    push.failing = false;
    google.calls = [];
    google.failing = false;
    tag = `${MARK} ${randomUUID().replace(/-/g, '').slice(0, 8)}`;
  });

  afterEach(async () => {
    // Classes go first: their location and creator are restricted.
    await prisma.schoolClass.deleteMany({ where: { creator: { email: { endsWith: `@${DOMAIN}` } } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: MARK } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  async function person(role: Role = 'admin', status: Status = 'approved') {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: `Person ${randomUUID().slice(0, 6)}`,
        email: `u.${randomUUID().slice(0, 8)}@${DOMAIN}`,
        status,
        role,
      },
    });
    return { id: user.id, token: tokens.signAccessToken(user).token };
  }

  async function account(role: Role = 'admin', status: Status = 'approved') {
    return (await person(role, status)).token;
  }

  const authed = (token: string, req: request.Test) => req.set('Authorization', `Bearer ${token}`);

  const edit = (token: string, id: string, body: Record<string, unknown>) =>
    authed(token, http().put(`/locations/${id}`)).send(body);

  const archive = (token: string, id: string) => authed(token, http().post(`/locations/${id}/archive`));

  /** A location saved straight in the database, as before this feature when it has no point. */
  async function seed(name: string, extra: { latitude?: number; longitude?: number; archivedAt?: Date } = {}) {
    const row = await prisma.location.create({
      data: {
        id: randomUUID(),
        name: `${tag} ${name}`,
        nameKey: extra.archivedAt ? null : `${tag} ${name}`.toLowerCase(),
        address: ADDRESS,
        ...extra,
      },
    });
    return row;
  }

  async function addClass(
    locationId: string,
    createdBy: string,
    instructorIds: string[],
    options: { startsAt?: Date; cancelledAt?: Date; deadline?: Date | null } = {},
  ) {
    const startsAt = options.startsAt ?? TOMORROW;
    return prisma.schoolClass.create({
      data: {
        id: randomUUID(),
        discipline: 'surf',
        level: 'beginner',
        startsAt,
        endsAt: new Date(startsAt.getTime() + 3_600_000),
        locationId,
        capacity: 8,
        createdBy,
        cancelledAt: options.cancelledAt ?? null,
        cancellationDeadline: options.deadline === undefined ? null : options.deadline,
        instructors: { create: instructorIds.map((userId) => ({ userId })) },
      },
    });
  }

  async function withPhone(userId: string, locale = 'pt-BR') {
    await prisma.pushToken.create({
      data: { token: `ExponentPushToken[${MARK}-${randomUUID().slice(0, 8)}]`, userId, locale },
    });
  }

  const create = (token: string, body: Record<string, unknown>) =>
    http().post('/locations').set('Authorization', `Bearer ${token}`).send(body);

  const list = (token: string) => http().get('/locations').set('Authorization', `Bearer ${token}`);

  const mine = (items: LocationBody[]) =>
    items.filter((item) => item.name.startsWith(MARK)).map((item) => item.name.replace(`${tag} `, ''));

  it('creates a location with the trimmed name and address, and lists it', async () => {
    const admin = await account();

    const created = await create(admin, {
      name: ` ${tag} Praia do Futuro `,
      address: ` ${ADDRESS} `,
      ...POINT,
    });

    expect(created.status).toBe(201);
    expect(created.body).toEqual({
      id: expect.any(String),
      name: `${tag} Praia do Futuro`,
      address: ADDRESS,
      ...POINT,
      upcomingClasses: 0,
    });

    const listed = await list(admin);

    expect(listed.status).toBe(200);
    expect(listed.body.items).toContainEqual(created.body);
  });

  it('lists by name ignoring case and accents', async () => {
    const admin = await account();
    for (const name of ['zeta', 'Água', 'beta', 'Álamo']) {
      await create(admin, { name: `${tag} ${name}`, address: ADDRESS, ...POINT });
    }

    const listed = await list(admin);

    expect(mine(listed.body.items)).toEqual(['Água', 'Álamo', 'beta', 'zeta']);
  });

  it('refuses a duplicated name ignoring case and accents', async () => {
    const admin = await account();
    await create(admin, { name: `${tag} Praia do Futuro`, address: ADDRESS, ...POINT });

    for (const name of [`${tag} praia do futuro`, `${tag} Práia do FUTURO`]) {
      const response = await create(admin, { name, address: 'Outro', ...POINT });

      expect(response.status).toBe(409);
      expect(response.body.errors).toEqual(['location.name.duplicate']);
    }
    expect(mine((await list(admin)).body.items)).toEqual(['Praia do Futuro']);
  });

  it('leaves one location when two creations of the same name run together', async () => {
    const admin = await account();
    const name = `${tag} Praia`;

    const responses = await Promise.all([
      create(admin, { name, address: ADDRESS, ...POINT }),
      create(admin, { name, address: ADDRESS, ...POINT }),
    ]);

    expect(responses.map((item) => item.status).sort((a, b) => a - b)).toEqual([201, 409]);
    expect(mine((await list(admin)).body.items)).toEqual(['Praia']);
  });

  it('collects the validation errors', async () => {
    const admin = await account();

    const empty = await create(admin, { name: '', address: '', ...POINT });
    const tooLong = await create(admin, { name: 'n'.repeat(41), address: 'a'.repeat(201), ...POINT });
    const missing = await http().post('/locations').set('Authorization', `Bearer ${admin}`);

    expect(empty.status).toBe(422);
    expect(empty.body.errors).toEqual(['location.name.required', 'location.address.required']);
    expect(tooLong.status).toBe(422);
    expect(tooLong.body.errors).toEqual(['location.name.max.length', 'location.address.max.length']);
    expect(missing.status).toBe(422);
    expect(missing.body.errors).toEqual([
      'location.name.required',
      'location.address.required',
      'location.point.required',
    ]);
  });

  describe('access', () => {
    it('answers 401 without a token', async () => {
      const [read, write] = await Promise.all([
        http().get('/locations'),
        http().post('/locations').send({ name: `${tag} x`, address: ADDRESS, ...POINT }),
      ]);

      expect(read.status).toBe(401);
      expect(read.body.errors).toEqual(['auth.token.invalid']);
      expect(write.status).toBe(401);
    });

    it.each(NOT_APPROVED)('refuses an account that is %s', async (status) => {
      const token = await account('admin', status);

      const read = await list(token);
      const write = await create(token, { name: `${tag} x`, address: ADDRESS, ...POINT });

      expect(read.status).toBe(403);
      expect(read.body.errors).toEqual(['user.status.notApproved']);
      expect(write.status).toBe(403);
      expect(write.body.errors).toEqual(['user.status.notApproved']);
    });

    it.each(['student', 'instructor'] as const)('lets an approved %s read but not create', async (role) => {
      const admin = await account();
      await create(admin, { name: `${tag} Praia`, address: ADDRESS, ...POINT });
      const token = await account(role);

      const read = await list(token);
      const write = await create(token, { name: `${tag} Outra`, address: ADDRESS, ...POINT });

      expect(read.status).toBe(200);
      expect(mine(read.body.items)).toEqual(['Praia']);
      expect(write.status).toBe(403);
      expect(write.body.errors).toEqual(['user.role.notAdmin']);
      expect(mine((await list(admin)).body.items)).toEqual(['Praia']);
    });
  });

  describe('point', () => {
    it('requires a latitude and a longitude, collecting the keys with the name and address ones', async () => {
      const admin = await account();

      const noPoint = await create(admin, { name: `${tag} A`, address: ADDRESS });
      const oneOnly = await create(admin, { name: `${tag} A`, address: ADDRESS, latitude: -3.7 });
      const nulls = await create(admin, { name: `${tag} A`, address: ADDRESS, latitude: null, longitude: null });
      const everything = await create(admin, { name: '', address: '', latitude: 91, longitude: 0 });

      for (const response of [noPoint, oneOnly, nulls]) {
        expect(response.status).toBe(422);
        expect(response.body.errors).toEqual(['location.point.required']);
      }
      expect(everything.status).toBe(422);
      expect(everything.body.errors).toEqual([
        'location.name.required',
        'location.address.required',
        'location.point.invalid',
      ]);
      expect(mine((await list(admin)).body.items)).toEqual([]);
    });

    it.each([
      [{ latitude: 'x', longitude: -38.4 }],
      [{ latitude: 91, longitude: -38.4 }],
      [{ latitude: -3.7, longitude: -181 }],
      [{ latitude: -3.7, longitude: {} }],
    ])('refuses the point %j as invalid and stores nothing', async (point) => {
      const admin = await account();

      const response = await create(admin, { name: `${tag} A`, address: ADDRESS, ...point });

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(['location.point.invalid']);
      expect(mine((await list(admin)).body.items)).toEqual([]);
    });

    it('lists a location saved before the map with a null point, and counts only upcoming classes', async () => {
      const admin = await person();
      const old = await seed('Antigo');
      await addClass(old.id, admin.id, [admin.id]);
      await addClass(old.id, admin.id, [admin.id], { startsAt: YESTERDAY });
      await addClass(old.id, admin.id, [admin.id], { cancelledAt: YESTERDAY });

      const listed = await list(admin.token);

      expect(listed.body.items).toContainEqual({
        id: old.id,
        name: `${tag} Antigo`,
        address: ADDRESS,
        latitude: null,
        longitude: null,
        upcomingClasses: 1,
      });
    });
  });

  describe('edit', () => {
    it('edits the name, the address and the point, and every class that uses the location follows', async () => {
      const admin = await person();
      const place = await seed('Antigo');
      const finished = await addClass(place.id, admin.id, [admin.id], { startsAt: YESTERDAY });
      const upcoming = await addClass(place.id, admin.id, [admin.id]);

      const response = await edit(admin.token, place.id, {
        name: ` ${tag} Novo `,
        address: ' Rua Nova, 10 ',
        ...POINT,
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: place.id,
        name: `${tag} Novo`,
        address: 'Rua Nova, 10',
        ...POINT,
        upcomingClasses: 1,
      });
      for (const item of [finished, upcoming]) {
        const read = await authed(admin.token, http().get(`/classes/${item.id}`));

        expect(read.status).toBe(200);
        expect(read.body.location).toEqual({
          id: place.id,
          name: `${tag} Novo`,
          address: 'Rua Nova, 10',
          ...POINT,
        });
      }
    });

    it('refuses a name another active location has, but accepts its own name in another case and an archived one', async () => {
      const admin = await account();
      const place = await seed('Praia');
      await seed('Iracema');
      await seed('Cumbuco', { archivedAt: new Date('2037-01-01T00:00:00.000Z') });
      const body = (name: string) => ({ name: `${tag} ${name}`, address: ADDRESS, ...POINT });

      const clash = await edit(admin, place.id, body('ÍRACEMA'));
      const own = await edit(admin, place.id, body('PRAIA'));
      const taken = await edit(admin, place.id, body('Cumbuco'));

      expect(clash.status).toBe(409);
      expect(clash.body.errors).toEqual(['location.name.duplicate']);
      expect(own.status).toBe(200);
      expect(own.body.name).toBe(`${tag} PRAIA`);
      expect(taken.status).toBe(200);
      expect(taken.body.name).toBe(`${tag} Cumbuco`);
    });

    it('answers 404 for an id that is not a uuid or does not exist, and 409 for an archived location', async () => {
      const admin = await account();
      const gone = await seed('Removido', { archivedAt: new Date('2037-01-01T00:00:00.000Z') });
      const body = { name: `${tag} X`, address: ADDRESS, ...POINT };

      const badId = await edit(admin, 'nope', body);
      const unknown = await edit(admin, randomUUID(), body);
      const archived = await edit(admin, gone.id, body);

      expect(badId.status).toBe(404);
      expect(badId.body.errors).toEqual(['location.notFound']);
      expect(unknown.status).toBe(404);
      expect(archived.status).toBe(409);
      expect(archived.body.errors).toEqual(['location.archived']);
    });

    it('collects every shape problem in one 422, including notify', async () => {
      const admin = await account();
      const place = await seed('Praia');

      const response = await edit(admin, place.id, {
        name: '',
        address: 'a'.repeat(201),
        latitude: 'x',
        longitude: -38.4,
        notify: 'yes',
      });

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual([
        'location.name.required',
        'location.address.max.length',
        'location.point.invalid',
        'location.notify.invalid',
      ]);
    });

    it('answers 200 and writes nothing when nothing differs', async () => {
      const admin = await person();
      const place = await seed('Praia', POINT);
      const instructor = await person('instructor');
      await withPhone(instructor.id);
      await addClass(place.id, admin.id, [instructor.id], { deadline: DEADLINE });

      const response = await edit(admin.token, place.id, {
        name: ` ${tag} Praia `,
        address: ADDRESS,
        ...POINT,
        notify: true,
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: place.id, upcomingClasses: 1 });
      expect((await prisma.location.findUnique({ where: { id: place.id } }))!.updatedAt).toEqual(place.updatedAt);
      expect((await prisma.schoolClass.findFirst({ where: { locationId: place.id } }))!.cancellationDeadline).toEqual(
        DEADLINE,
      );
      expect(push.sent).toHaveLength(0);
    });

    describe('deadline', () => {
      async function setupClasses() {
        const admin = await person();
        const place = await seed('Praia', POINT);
        const other = await seed('Outra', POINT);
        const upcoming = await addClass(place.id, admin.id, [admin.id], { deadline: DEADLINE });
        const started = await addClass(place.id, admin.id, [admin.id], { startsAt: YESTERDAY, deadline: DEADLINE });
        const cancelled = await addClass(place.id, admin.id, [admin.id], {
          cancelledAt: YESTERDAY,
          deadline: DEADLINE,
        });
        const elsewhere = await addClass(other.id, admin.id, [admin.id], { deadline: DEADLINE });
        const read = async (id: string) =>
          (await prisma.schoolClass.findUnique({ where: { id } }))!;

        return { admin, place, upcoming, started, cancelled, elsewhere, read };
      }

      it.each([
        ['address', { address: 'Rua nova, 1' }],
        ['name', { name: `${MARK} outro nome` }],
      ])('sends the upcoming deadlines to be worked out again when the %s changes', async (_label, change) => {
        const { admin, place, upcoming, started, cancelled, elsewhere, read } = await setupClasses();

        const response = await edit(admin.token, place.id, {
          name: `${tag} Praia`,
          address: ADDRESS,
          ...POINT,
          ...change,
        });

        expect(response.status).toBe(200);
        const cleared = await read(upcoming.id);
        expect(cleared.cancellationDeadline).toBeNull();
        expect(cleared.deadlineRevision).toBe(upcoming.deadlineRevision + 1);
        for (const kept of [started, cancelled, elsewhere]) {
          const row = await read(kept.id);
          expect(row.cancellationDeadline).toEqual(DEADLINE);
          expect(row.deadlineRevision).toBe(kept.deadlineRevision);
        }
      });

      it('keeps every deadline when only the point moves', async () => {
        const { admin, place, upcoming, read } = await setupClasses();

        const response = await edit(admin.token, place.id, {
          name: `${tag} Praia`,
          address: ADDRESS,
          latitude: -3.8,
          longitude: -38.6,
        });

        expect(response.status).toBe(200);
        expect((await read(upcoming.id)).cancellationDeadline).toEqual(DEADLINE);
      });

      it('clears nothing when the edit is refused', async () => {
        const { admin, place, upcoming, read } = await setupClasses();

        const response = await edit(admin.token, place.id, { name: '', address: 'Rua', ...POINT });

        expect(response.status).toBe(422);
        expect((await read(upcoming.id)).cancellationDeadline).toEqual(DEADLINE);
      });
    });

    describe('notifies', () => {
      async function setupClasses() {
        const admin = await person();
        const instructorI = await person('instructor');
        const instructorJ = await person('instructor');
        for (const who of [admin, instructorI, instructorJ]) await withPhone(who.id);
        const place = await seed('Praia', POINT);
        await addClass(place.id, admin.id, [instructorI.id]);
        await addClass(place.id, admin.id, [instructorI.id]);
        await addClass(place.id, admin.id, [instructorJ.id, admin.id]);
        await addClass(place.id, admin.id, [instructorJ.id], { startsAt: YESTERDAY });
        await addClass(place.id, admin.id, [instructorJ.id], { cancelledAt: YESTERDAY });

        return { admin, instructorI, instructorJ, place };
      }

      const change = { address: 'Rua nova, 1' };

      it('tells each instructor of the upcoming classes once, except the admin who edits', async () => {
        const { admin, instructorI, instructorJ, place } = await setupClasses();

        const response = await edit(admin.token, place.id, {
          name: `${tag} Praia`,
          ...POINT,
          ...change,
          notify: true,
        });

        expect(response.status).toBe(200);
        const stored = await prisma.notification.findMany({
          where: { type: 'location.changed', userId: { in: [admin.id, instructorI.id, instructorJ.id] } },
        });
        const byUser = Object.fromEntries(stored.map((item) => [item.userId, item.params]));
        expect(Object.keys(byUser).sort()).toEqual([instructorI.id, instructorJ.id].sort());
        expect(byUser[instructorI.id]).toEqual({ count: 2, locationName: `${tag} Praia` });
        expect(byUser[instructorJ.id]).toEqual({ count: 1, locationName: `${tag} Praia` });
        expect(push.sent).toHaveLength(2);
        const toI = push.sent.find((message) => message.params.count === 2)!;
        expect(toI).toMatchObject({ type: 'location.changed', locale: 'pt-BR' });
        expect(renderPush('location.changed', toI.params, 'pt-BR')).toEqual({
          title: 'Local de aula alterado',
          body: `O local ${tag} Praia mudou. Confira suas 2 próximas aulas lá.`,
        });
      });

      describe('location tells students', () => {
        const enrol = (classId: string, studentId: string, status: 'approved' | 'pending' | 'withdrawn') =>
          prisma.enrolment.create({
            data: { id: randomUUID(), classId, studentId, status, requestedAt: NOW },
          });

        it('tells the students and pending requests of the upcoming classes with their own counts', async () => {
          const admin = await person();
          const instructor = await person('instructor');
          const seated = await person('student');
          const pending = await person('student');
          const gone = await person('student');
          for (const who of [seated, pending]) await withPhone(who.id);
          const place = await seed('Praia', POINT);
          const first = await addClass(place.id, admin.id, [instructor.id]);
          const second = await addClass(place.id, admin.id, [instructor.id]);
          const past = await addClass(place.id, admin.id, [instructor.id], { startsAt: YESTERDAY });
          const cancelled = await addClass(place.id, admin.id, [instructor.id], { cancelledAt: YESTERDAY });
          await enrol(first.id, seated.id, 'approved');
          await enrol(second.id, seated.id, 'approved');
          await enrol(past.id, seated.id, 'approved');
          await enrol(first.id, pending.id, 'pending');
          await enrol(cancelled.id, pending.id, 'pending');
          await enrol(first.id, gone.id, 'withdrawn');

          const response = await edit(admin.token, place.id, {
            name: `${tag} Praia`,
            ...POINT,
            address: 'Rua nova, 1',
            notify: true,
          });

          expect(response.status).toBe(200);
          const stored = await prisma.notification.findMany({
            where: { type: 'location.changed', userId: { in: [seated.id, pending.id, gone.id] } },
          });
          const byUser = Object.fromEntries(stored.map((item) => [item.userId, item.params]));
          expect(Object.keys(byUser).sort()).toEqual([seated.id, pending.id].sort());
          expect(byUser[seated.id]).toEqual({ count: 2, locationName: `${tag} Praia` });
          expect(byUser[pending.id]).toEqual({ count: 1, locationName: `${tag} Praia` });
          expect(push.sent).toHaveLength(2);
        });

        it('tells one notification with the larger count to a student who also teaches, and nobody with notify false', async () => {
          const admin = await person();
          const both = await person('instructor');
          const place = await seed('Praia', POINT);
          const first = await addClass(place.id, admin.id, [both.id]);
          await addClass(place.id, admin.id, [both.id]);
          await enrol(first.id, both.id, 'approved');
          const body = { name: `${tag} Praia`, ...POINT, address: 'Rua nova, 1' };

          await edit(admin.token, place.id, { ...body, notify: false });
          expect(await prisma.notification.count({ where: { userId: both.id, type: 'location.changed' } })).toBe(0);

          await edit(admin.token, place.id, { ...body, address: 'Rua nova, 2', notify: true });
          const stored = await prisma.notification.findMany({ where: { userId: both.id, type: 'location.changed' } });
          expect(stored.map((item) => item.params)).toEqual([{ count: 2, locationName: `${tag} Praia` }]);
        });
      });

      it.each([[{}], [{ notify: false }]])('tells nobody with %j', async (extra) => {
        const { admin, place } = await setupClasses();

        const response = await edit(admin.token, place.id, {
          name: `${tag} Praia`,
          ...POINT,
          ...change,
          ...extra,
        });

        expect(response.status).toBe(200);
        expect(push.sent).toHaveLength(0);
      });

      it('tells nobody when no upcoming class uses the location', async () => {
        const admin = await person();
        const place = await seed('Vazio', POINT);

        const response = await edit(admin.token, place.id, {
          name: `${tag} Vazio`,
          ...POINT,
          ...change,
          notify: true,
        });

        expect(response.status).toBe(200);
        expect(push.sent).toHaveLength(0);
      });

      it('keeps the edit and the 200 when the push fails', async () => {
        const { admin, place } = await setupClasses();
        push.failing = true;

        const response = await edit(admin.token, place.id, {
          name: `${tag} Praia`,
          ...POINT,
          ...change,
          notify: true,
        });

        expect(response.status).toBe(200);
        expect((await prisma.location.findUnique({ where: { id: place.id } }))!.address).toBe('Rua nova, 1');
      });
    });

    it('refuses accounts that are not approved admins, checking the status first', async () => {
      const place = await seed('Praia');
      const body = { name: `${tag} X`, address: ADDRESS, ...POINT };

      const pending = await edit(await account('admin', 'pending'), place.id, body);
      const student = await edit(await account('student'), place.id, body);
      const instructor = await edit(await account('instructor'), place.id, body);
      const anonymous = await http().put(`/locations/${place.id}`).send(body);

      expect(pending.status).toBe(403);
      expect(pending.body.errors).toEqual(['user.status.notApproved']);
      expect(student.status).toBe(403);
      expect(student.body.errors).toEqual(['user.role.notAdmin']);
      expect(instructor.body.errors).toEqual(['user.role.notAdmin']);
      expect(anonymous.status).toBe(401);
      expect((await prisma.location.findUnique({ where: { id: place.id } }))!.name).toBe(`${tag} Praia`);
    });
  });

  describe('archive', () => {
    it('archives the location: it leaves the list, its name is free and its classes keep it', async () => {
      const admin = await person();
      const place = await seed('Praia', POINT);
      const finished = await addClass(place.id, admin.id, [admin.id], { startsAt: YESTERDAY });

      const response = await archive(admin.token, place.id);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
      expect(mine((await list(admin.token)).body.items)).toEqual([]);
      const read = await authed(admin.token, http().get(`/classes/${finished.id}`));
      expect(read.body.location).toEqual({
        id: place.id,
        name: `${tag} Praia`,
        address: ADDRESS,
        ...POINT,
      });
      const again = await create(admin.token, { name: `${tag} Praia`, address: ADDRESS, ...POINT });
      expect(again.status).toBe(201);
    });

    it('answers 409 when it is already archived, and 404 for an unknown or malformed id', async () => {
      const admin = await account();
      const place = await seed('Praia');
      await archive(admin, place.id).expect(204);

      const again = await archive(admin, place.id);
      const unknown = await archive(admin, randomUUID());
      const malformed = await archive(admin, 'nope');

      expect(again.status).toBe(409);
      expect(again.body.errors).toEqual(['location.archived']);
      expect(unknown.status).toBe(404);
      expect(unknown.body.errors).toEqual(['location.notFound']);
      expect(malformed.status).toBe(404);
    });

    it('lets one of two concurrent archives win', async () => {
      const admin = await account();
      const place = await seed('Praia');

      const responses = await Promise.all([archive(admin, place.id), archive(admin, place.id)]);

      expect(responses.map((item) => item.status).sort((a, b) => a - b)).toEqual([204, 409]);
    });

    it('archives the last active location', async () => {
      const admin = await account();
      const only = await seed('Unica');

      expect((await archive(admin, only.id)).status).toBe(204);
      expect(mine((await list(admin)).body.items)).toEqual([]);
    });

    it('refuses accounts that are not approved admins', async () => {
      const place = await seed('Praia');

      const pending = await archive(await account('admin', 'pending'), place.id);
      const student = await archive(await account('student'), place.id);
      const instructor = await archive(await account('instructor'), place.id);
      const anonymous = await http().post(`/locations/${place.id}/archive`);

      expect(pending.body.errors).toEqual(['user.status.notApproved']);
      expect(student.status).toBe(403);
      expect(student.body.errors).toEqual(['user.role.notAdmin']);
      expect(instructor.status).toBe(403);
      expect(anonymous.status).toBe(401);
      expect((await prisma.location.findUnique({ where: { id: place.id } }))!.archivedAt).toBeNull();
    });
  });

  describe('suggestions', () => {
    const suggest = (token: string, query: string) =>
      authed(token, http().get(`/locations/address-suggestions${query}`));

    it('answers the suggestions the provider finds, with the query, token and language it was sent', async () => {
      const admin = await account();

      const response = await suggest(admin, '?q=%20praia%20do%20fut%20&sessionToken=abc123&language=en');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        items: [{ placeId: 'p1', title: 'Praia do Futuro', description: 'Fortaleza - CE' }],
      });
      expect(google.calls).toEqual([
        { method: 'suggest', args: { query: 'praia do fut', sessionToken: 'abc123', language: 'en' } },
      ]);
    });

    it('answers the place behind a suggestion', async () => {
      const admin = await account();

      const response = await suggest(admin, '/p1?sessionToken=abc123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ address: ADDRESS, ...POINT, name: 'Praia do Futuro' });
      expect(google.calls[0]).toEqual({
        method: 'findPlace',
        args: { placeId: 'p1', sessionToken: 'abc123', language: 'pt-BR' },
      });
    });

    it('validates the query and the session token without calling the provider', async () => {
      const admin = await account();

      const short = await suggest(admin, '?q=ab&sessionToken=abc123');
      const noToken = await suggest(admin, '?q=praia');
      const badToken = await suggest(admin, '?q=praia&sessionToken=a%20b');
      const placeToken = await suggest(admin, '/p1?sessionToken=');

      expect(short.status).toBe(422);
      expect(short.body.errors).toEqual(['location.suggestions.query.invalid']);
      expect(noToken.body.errors).toEqual(['location.suggestions.sessionToken.invalid']);
      expect(badToken.status).toBe(422);
      expect(placeToken.body.errors).toEqual(['location.suggestions.sessionToken.invalid']);
      expect(google.calls).toEqual([]);
    });

    it('answers 502 when the provider fails and 404 for an unknown place', async () => {
      const admin = await account();
      google.failing = true;

      const down = await suggest(admin, '?q=praia&sessionToken=abc123');
      const downPlace = await suggest(admin, '/p1?sessionToken=abc123');
      google.failing = false;
      google.place = null;
      const unknown = await suggest(admin, '/nope?sessionToken=abc123');

      expect(down.status).toBe(502);
      expect(down.body.errors).toEqual(['location.suggestions.unavailable']);
      expect(downPlace.status).toBe(502);
      expect(unknown.status).toBe(404);
      expect(unknown.body.errors).toEqual(['location.place.notFound']);
    });

    it('refuses accounts that are not approved admins', async () => {
      const path = '?q=praia&sessionToken=abc123';

      const student = await suggest(await account('student'), path);
      const instructor = await suggest(await account('instructor'), '/p1?sessionToken=abc123');
      const pending = await suggest(await account('admin', 'pending'), path);
      const anonymous = await http().get(`/locations/address-suggestions${path}`);

      expect(student.status).toBe(403);
      expect(student.body.errors).toEqual(['user.role.notAdmin']);
      expect(instructor.status).toBe(403);
      expect(pending.body.errors).toEqual(['user.status.notApproved']);
      expect(anonymous.status).toBe(401);
      expect(google.calls).toEqual([]);
    });
  });
});
