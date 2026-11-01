import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/db/prisma.service.js';
import { JwtTokenProvider } from '../src/modules/auth/jwt.token.js';
import { PrismaClassMessageRepository } from '../src/modules/classes/class-message.prisma.js';
import { SystemClockProvider as ClassesClockProvider } from '../src/modules/classes/system.clock.js';
import { ExpoPushProvider } from '../src/modules/notifications/expo.push.js';
import { NotificationsClassChangeNotifier } from '../src/modules/notifications/notifications.class-change-notifier.js';

// Secrets the backend refuses to start without; CI has no .env.
process.env.AUTH_CODE_PEPPER ??= 'e2e-pepper';
process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';

const DOMAIN = 'class-messages.e2e.example.com';
const MARK = 'e2eclassmessages';
// Wednesday 2026-10-14, 10:00 in Fortaleza.
const NOW = new Date('2026-10-14T13:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NUMBER = '+5585999999999';

type Role = 'student' | 'instructor' | 'admin';
type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';

interface Account {
  id: string;
  accessToken: string;
}

interface AccountOptions {
  status?: Status;
  name?: string;
  photoUrl?: string;
  whatsappNumber?: string;
  whatsappVisible?: boolean;
}

describe('Class messages (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: JwtTokenProvider;
  let locationId: string;
  let admin: Account;
  let classIds: string[];
  let userIds: string[];

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [(await import('../src/app.module.js')).AppModule],
    })
      .overrideProvider(ExpoPushProvider)
      .useValue({ send: async () => [], getReceipts: async () => ({}) })
      .overrideProvider(ClassesClockProvider)
      .useValue({ now: () => new Date(NOW.getTime()) })
      .compile();
    app = moduleRef.createNestApplication<INestApplication<App>>();
    await app.init();
    prisma = app.get(PrismaService);
    tokens = app.get(JwtTokenProvider, { strict: false });
    classIds = [];
    userIds = [];
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
    admin = await account('admin', { name: 'Ana Souza' });
  });

  afterEach(async () => {
    // The classes go first (their messages cascade), then the location and the users. An erased account has
    // no email, so the users go by id.
    await prisma.schoolClass.deleteMany({ where: { id: { in: classIds } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: MARK } } });
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const send = (token: string, id: string, body: Record<string, unknown>) =>
    http().post(`/classes/${id}/message`).set('Authorization', `Bearer ${token}`).send(body);
  const list = (token: string | undefined, id: string) => {
    const req = http().get(`/classes/${id}/messages`);
    return token === undefined ? req : req.set('Authorization', `Bearer ${token}`);
  };
  const valid = { title: '  Ponto de encontro  ', message: '  Barraca azul, 15 minutos antes.  ' };
  const storedOn = (classId: string) => prisma.classMessage.findMany({ where: { classId } });
  const notificationsOf = (userId: string) =>
    prisma.notification.findMany({ where: { userId, type: 'class.message' } });

  async function account(role: Role = 'student', options: AccountOptions = {}): Promise<Account> {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: options.name ?? `Person ${role}`,
        email: `u.${randomUUID().slice(0, 8)}@${DOMAIN}`,
        role,
        status: options.status ?? 'approved',
        photoUrl: options.photoUrl ?? null,
        whatsappNumber: options.whatsappNumber ?? null,
        whatsappVisible: options.whatsappVisible ?? false,
      },
    });
    userIds.push(user.id);

    return { id: user.id, accessToken: tokens.signAccessToken({ id: user.id, email: user.email! }).token };
  }

  /** A one-hour class starting `offsetMs` from now, taught by `instructorIds`. */
  async function makeClass(
    offsetMs: number = DAY,
    instructorIds: string[] = [],
    options: { cancelled?: boolean } = {},
  ): Promise<string> {
    const id = randomUUID();
    const startsAt = new Date(NOW.getTime() + offsetMs);
    await prisma.schoolClass.create({
      data: {
        id,
        discipline: 'surf',
        level: 'beginner',
        startsAt,
        endsAt: new Date(startsAt.getTime() + HOUR),
        cancelledAt: options.cancelled ? NOW : null,
        locationId,
        capacity: 8,
        createdBy: admin.id,
        instructors: { create: instructorIds.map((userId) => ({ userId })) },
      },
    });
    classIds.push(id);

    return id;
  }

  const storeMessage = (classId: string, senderId: string, title = 'Aviso', createdAt = NOW) =>
    prisma.classMessage.create({
      data: { id: randomUUID(), classId, senderId, title, message: `${title} text`, createdAt },
    });

  describe('stores', () => {
    it('keeps one row with the class, the sender and the trimmed text, and tells the people as before', async () => {
      const instructor = await account('instructor');
      const id = await makeClass(DAY, [instructor.id]);

      const response = await send(admin.accessToken, id, valid);

      expect(response.status).toBe(204);
      expect(await storedOn(id)).toEqual([
        expect.objectContaining({
          classId: id,
          senderId: admin.id,
          title: 'Ponto de encontro',
          message: 'Barraca azul, 15 minutos antes.',
        }),
      ]);
      expect(await notificationsOf(instructor.id)).toHaveLength(1);
    });

    it('keeps the row when nobody would be told', async () => {
      const id = await makeClass(DAY, [admin.id]);

      const response = await send(admin.accessToken, id, valid);

      expect(response.status).toBe(204);
      expect(await storedOn(id)).toHaveLength(1);
    });

    it('stores nothing on any refusal', async () => {
      const student = await account();
      const upcoming = await makeClass();
      const finished = await makeClass(-2 * HOUR);
      const cancelled = await makeClass(DAY, [], { cancelled: true });

      const refused = await send(student.accessToken, upcoming, valid);
      const invalid = await send(admin.accessToken, upcoming, { title: '', message: 'Oi' });
      const over = await send(admin.accessToken, finished, valid);
      const off = await send(admin.accessToken, cancelled, valid);
      const missing = await send(admin.accessToken, randomUUID(), valid);

      expect(refused.status).toBe(403);
      expect(invalid.status).toBe(422);
      expect(over.status).toBe(409);
      expect(off.status).toBe(409);
      expect(missing.status).toBe(404);
      expect(await prisma.classMessage.count({ where: { classId: { in: classIds } } })).toBe(0);
    });

    it('answers 204 and keeps the row when the notifier fails', async () => {
      const instructor = await account('instructor');
      const id = await makeClass(DAY, [instructor.id]);
      const notifier = app.get(NotificationsClassChangeNotifier, { strict: false });
      vi.spyOn(notifier, 'classMessage').mockRejectedValueOnce(new Error('notifier down'));

      const response = await send(admin.accessToken, id, valid);

      expect(response.status).toBe(204);
      expect(await storedOn(id)).toHaveLength(1);
    });

    it('answers an error and tells nobody when the store fails', async () => {
      const instructor = await account('instructor');
      const id = await makeClass(DAY, [instructor.id]);
      const repository = app.get(PrismaClassMessageRepository, { strict: false });
      vi.spyOn(repository, 'create').mockRejectedValueOnce(new Error('store down'));

      const response = await send(admin.accessToken, id, valid);

      expect(response.status).toBe(500);
      expect(await notificationsOf(instructor.id)).toHaveLength(0);
    });
  });

  describe('list', () => {
    it('answers every message of the class, newest first, to any approved role, part of it or not', async () => {
      const id = await makeClass();
      const other = await makeClass();
      await storeMessage(id, admin.id, 'Older', NOW);
      await storeMessage(id, admin.id, 'Newer', new Date(NOW.getTime() + HOUR));
      await storeMessage(other, admin.id, 'Another class');

      for (const role of ['student', 'instructor', 'admin'] as const) {
        const reader = await account(role);

        const response = await list(reader.accessToken, id);

        expect(response.status).toBe(200);
        expect(response.body.items.map((item: { title: string }) => item.title)).toEqual(['Newer', 'Older']);
      }
    });

    it('answers the fields of the contract', async () => {
      const id = await makeClass();
      const stored = await storeMessage(id, admin.id);

      const response = await list(admin.accessToken, id);

      expect(response.body).toEqual({
        items: [
          {
            id: stored.id,
            title: 'Aviso',
            message: 'Aviso text',
            createdAt: NOW.toISOString(),
            sender: { id: admin.id, name: 'Ana Souza', photoUrl: null, role: 'admin', whatsappNumber: null },
          },
        ],
      });
    });

    it('answers { items: [] } for a class with none', async () => {
      const response = await list(admin.accessToken, await makeClass());

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ items: [] });
    });

    it('still answers for a started, finished or cancelled class', async () => {
      const student = await account();
      const started = await makeClass(-30 * 60 * 1000);
      const finished = await makeClass(-2 * DAY);
      const cancelled = await makeClass(DAY, [], { cancelled: true });

      for (const id of [started, finished, cancelled]) {
        await storeMessage(id, admin.id);

        const response = await list(student.accessToken, id);

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
      }
    });

    it('refuses an account that is not approved, and no session', async () => {
      const id = await makeClass();

      for (const status of ['pending', 'denied', 'deleted', 'removed'] as const) {
        const reader = await account('student', { status });

        expect((await list(reader.accessToken, id)).status).toBe(403);
      }
      expect((await list(undefined, id)).status).toBe(401);
    });

    it('answers 404 class.notFound for a malformed or unknown id', async () => {
      for (const id of ['not-a-uuid', randomUUID()]) {
        const response = await list(admin.accessToken, id);

        expect(response.status).toBe(404);
        expect(JSON.stringify(response.body)).toContain('class.notFound');
      }
    });

    it('deletes the messages with the class', async () => {
      const id = await makeClass();
      await send(admin.accessToken, id, valid);

      const response = await http().delete(`/classes/${id}`).set('Authorization', `Bearer ${admin.accessToken}`);

      expect(response.status).toBe(204);
      expect(await storedOn(id)).toEqual([]);
    });
  });

  describe('sender', () => {
    it("shows the account's current name and photo, not what they were when it was sent", async () => {
      const sender = await account('admin', { name: 'Ana', photoUrl: 'https://photos.test/old.jpg' });
      const id = await makeClass();
      await send(sender.accessToken, id, valid);

      await prisma.user.update({
        where: { id: sender.id },
        data: { name: 'Ana Maria', photoUrl: 'https://photos.test/new.jpg' },
      });

      const { body } = await list(admin.accessToken, id);

      expect(body.items[0].sender).toMatchObject({
        id: sender.id,
        name: 'Ana Maria',
        photoUrl: 'https://photos.test/new.jpg',
        role: 'admin',
      });
    });
  });

  describe('whatsapp', () => {
    async function numberSeenBy(reader: Role, sender: AccountOptions): Promise<string | null> {
      const from = await account('admin', sender);
      const viewer = await account(reader);
      const id = await makeClass();
      await storeMessage(id, from.id);

      const { body } = await list(viewer.accessToken, id);

      return body.items[0].sender.whatsappNumber;
    }

    it('shows a shared number to everyone', async () => {
      expect(await numberSeenBy('student', { whatsappNumber: NUMBER, whatsappVisible: true })).toBe(NUMBER);
    });

    it('shows an unshared number only to an admin', async () => {
      expect(await numberSeenBy('instructor', { whatsappNumber: NUMBER })).toBeNull();
      expect(await numberSeenBy('admin', { whatsappNumber: NUMBER })).toBe(NUMBER);
    });

    it('answers null to everyone for a sender with no number', async () => {
      expect(await numberSeenBy('admin', {})).toBeNull();
    });

    it("answers null to everyone for a sender who isn't approved any more", async () => {
      expect(
        await numberSeenBy('admin', { whatsappNumber: NUMBER, whatsappVisible: true, status: 'deleted' }),
      ).toBeNull();
    });
  });

  describe('erased sender', () => {
    it('answers sender null, with the title and the text', async () => {
      const sender = await account('admin');
      const id = await makeClass();
      await storeMessage(id, sender.id);
      await prisma.user.update({
        where: { id: sender.id },
        data: { status: 'erased', name: null, email: null, erasedAt: NOW },
      });

      const { body } = await list(admin.accessToken, id);

      expect(body.items[0]).toMatchObject({ title: 'Aviso', message: 'Aviso text', sender: null });
    });
  });
});
