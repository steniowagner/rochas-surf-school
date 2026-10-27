import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { PushMessage } from '@rochas-surf-school/notifications';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/db/prisma.service.js';
import { JwtTokenProvider } from '../src/modules/auth/jwt.token.js';
import { ExpoPushProvider } from '../src/modules/notifications/expo.push.js';
import { renderPush } from '../src/modules/notifications/push-messages.js';

// Secrets the backend refuses to start without; CI has no .env.
process.env.AUTH_CODE_PEPPER ??= 'e2e-pepper';
process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';

const DOMAIN = 'reactivation-requests.e2e.example.com';
const MARK = 'e2ereact';
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type Role = 'student' | 'instructor' | 'admin';
type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';
type ReactivationStatus = 'requested' | 'denied';
type EnrolmentStatus = 'pending' | 'approved' | 'withdrawn' | 'cancelled' | 'takenOut';

interface Account {
  id: string;
  email: string;
  accessToken: string;
}

/** Records the pushes instead of calling Expo. */
class FakePushProvider {
  sent: PushMessage[] = [];
  failing = false;

  async send(messages: PushMessage[]) {
    this.sent.push(...messages);
    if (this.failing) {
      throw new Error('expo unavailable');
    }
    return messages.map(() => ({ status: 'ok' as const, id: `ticket-${randomUUID()}` }));
  }

  async getReceipts() {
    return {};
  }
}

describe('Reactivation requests (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: JwtTokenProvider;
  let push: FakePushProvider;
  let locationId: string;
  let admin: Account;

  beforeEach(async () => {
    push = new FakePushProvider();
    const moduleRef = await Test.createTestingModule({
      imports: [(await import('../src/app.module.js')).AppModule],
    })
      .overrideProvider(ExpoPushProvider)
      .useValue(push)
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
    admin = await account('admin');
  });

  afterEach(async () => {
    // The classes go first (their enrolments cascade); notifications and push tokens go with their user.
    await prisma.schoolClass.deleteMany({ where: { creator: { email: { endsWith: `@${DOMAIN}` } } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: MARK } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const as = (token: string | undefined, req: request.Test) =>
    token === undefined ? req : req.set('Authorization', `Bearer ${token}`);
  const list = (token?: string) => as(token, http().get('/reactivation-requests'));
  const approve = (token: string | undefined, id: string) =>
    as(token, http().post(`/reactivation-requests/${id}/approve`));
  const deny = (token: string | undefined, id: string, body?: object) => {
    const req = as(token, http().post(`/reactivation-requests/${id}/deny`));
    return body === undefined ? req : req.send(body);
  };
  const me = (token: string) => as(token, http().get('/auth/me'));
  const rowOf = (id: string) => prisma.user.findUniqueOrThrow({ where: { id } });
  const rowsOf = (userId: string, type?: string) =>
    prisma.notification.findMany({ where: { userId, ...(type ? { type } : {}) } });
  const device = (userId: string, locale = 'pt-BR') =>
    prisma.pushToken.create({
      data: { token: `ExponentPushToken[${MARK}-${randomUUID().slice(0, 8)}]`, userId, locale },
    });

  async function account(
    role: Role = 'student',
    status: Status = 'approved',
    extra: Partial<{
      name: string;
      reactivationStatus: ReactivationStatus;
      reactivationRequestedAt: Date;
      deletedAt: Date;
    }> = {},
  ): Promise<Account> {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: extra.name ?? `Person ${role}`,
        email: `u.${randomUUID().slice(0, 8)}@${DOMAIN}`,
        whatsappNumber: '+5585999990000',
        role,
        status,
        deletedAt: status === 'deleted' ? (extra.deletedAt ?? new Date('2026-10-01T10:00:00.000Z')) : null,
        reactivationStatus: extra.reactivationStatus ?? null,
        reactivationRequestedAt: extra.reactivationRequestedAt ?? null,
      },
    });
    const subject = { id: user.id, email: user.email! };
    return { ...subject, accessToken: tokens.signAccessToken(subject).token };
  }

  /** A deleted account whose request waits for an answer. */
  const requested = (requestedAt: string, role: Role = 'student', name?: string) =>
    account(role, 'deleted', {
      name,
      reactivationStatus: 'requested',
      reactivationRequestedAt: new Date(requestedAt),
    });

  /** A one-hour class starting `offsetMs` from the real now. */
  async function makeClass(offsetMs: number, cancelled = false): Promise<string> {
    const startsAt = new Date(Date.now() + offsetMs);
    const id = randomUUID();
    await prisma.schoolClass.create({
      data: {
        id,
        discipline: 'surf',
        level: 'beginner',
        startsAt,
        endsAt: new Date(startsAt.getTime() + HOUR),
        locationId,
        capacity: 8,
        createdBy: admin.id,
        cancelledAt: cancelled ? new Date(Date.now() - 30 * DAY) : null,
      },
    });
    return id;
  }

  async function enrol(
    classId: string,
    studentId: string,
    status: EnrolmentStatus,
    requestedAt = new Date('2026-08-01T12:00:00.000Z'),
  ): Promise<string> {
    const id = randomUUID();
    await prisma.enrolment.create({ data: { id, classId, studentId, status, requestedAt } });
    return id;
  }

  describe('lists', () => {
    it('answers the requests oldest first, with the classes taken', async () => {
      const a = await requested('2026-10-10T10:00:00.000Z', 'student', 'Ana A');
      const b = await requested('2026-10-05T10:00:00.000Z', 'instructor', 'Bia B');
      await account('student', 'deleted', { name: 'Never asked' });
      await account('student', 'deleted', {
        name: 'Denied',
        reactivationStatus: 'denied',
        reactivationRequestedAt: new Date('2026-10-02T10:00:00.000Z'),
      });
      await account('student', 'approved', { name: 'Approved' });
      for (const offset of [-10 * DAY, -7 * DAY]) {
        await enrol(await makeClass(offset), a.id, 'approved');
      }

      const response = await list(admin.accessToken);

      expect(response.status).toBe(200);
      expect(response.body.items).toEqual([
        {
          id: b.id,
          name: 'Bia B',
          email: b.email,
          role: 'instructor',
          deletedAt: '2026-10-01T10:00:00.000Z',
          requestedAt: '2026-10-05T10:00:00.000Z',
          classesTaken: 0,
        },
        {
          id: a.id,
          name: 'Ana A',
          email: a.email,
          role: 'student',
          deletedAt: '2026-10-01T10:00:00.000Z',
          requestedAt: '2026-10-10T10:00:00.000Z',
          classesTaken: 2,
        },
      ]);
    });

    it('does not count seats later lost, cancelled classes or classes that have not ended', async () => {
      const a = await requested('2026-10-10T10:00:00.000Z');
      await enrol(await makeClass(-10 * DAY), a.id, 'approved');
      await enrol(await makeClass(-9 * DAY), a.id, 'withdrawn');
      await enrol(await makeClass(-8 * DAY), a.id, 'cancelled');
      await enrol(await makeClass(-7 * DAY), a.id, 'takenOut');
      await enrol(await makeClass(-6 * DAY), a.id, 'pending');
      await enrol(await makeClass(-5 * DAY, true), a.id, 'approved');
      await enrol(await makeClass(5 * DAY), a.id, 'approved');
      // Approved first, then taken out later: the latest enrolment decides.
      const taken = await makeClass(-4 * DAY);
      await enrol(taken, a.id, 'approved', new Date('2026-08-01T12:00:00.000Z'));
      await enrol(taken, a.id, 'takenOut', new Date('2026-08-02T12:00:00.000Z'));

      const response = await list(admin.accessToken);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].classesTaken).toBe(1);
    });

    it('breaks equal request dates by id', async () => {
      const first = await requested('2026-10-05T10:00:00.000Z');
      const second = await requested('2026-10-05T10:00:00.000Z');

      const response = await list(admin.accessToken);

      expect(response.body.items.map((item: { id: string }) => item.id)).toEqual(
        [first.id, second.id].sort((a, b) => a.localeCompare(b)),
      );
    });

    it('answers no items without a request', async () => {
      const response = await list(admin.accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ items: [] });
    });
  });

  describe('approves', () => {
    it('brings the account back with its role, keeping the cancelled seats cancelled', async () => {
      const ana = await requested('2026-10-05T10:00:00.000Z', 'instructor', 'Ana Instructor');
      const cancelled = await enrol(await makeClass(2 * DAY), ana.id, 'cancelled');

      const response = await approve(admin.accessToken, ana.id);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: ana.id, decision: 'approved' });
      const profile = await me(ana.accessToken);
      expect(profile.status).toBe(200);
      expect(profile.body).toMatchObject({
        status: 'approved',
        role: 'instructor',
        name: 'Ana Instructor',
        whatsappNumber: '+5585999990000',
        reactivationStatus: null,
      });
      const row = await rowOf(ana.id);
      expect(row.deletedAt).toBeNull();
      expect(row.reactivationRequestedAt).toBeNull();
      expect((await prisma.enrolment.findUniqueOrThrow({ where: { id: cancelled } })).status).toBe('cancelled');
      expect((await list(admin.accessToken)).body.items).toEqual([]);
    });

    it('lets the account delete itself and ask again', async () => {
      const ana = await requested('2026-10-05T10:00:00.000Z');
      await approve(admin.accessToken, ana.id).expect(200);
      const approved = tokens.signAccessToken({ id: ana.id, email: ana.email }).token;

      await as(approved, http().delete('/auth/me')).expect(204);
      const sent = await as(approved, http().post('/auth/me/reactivation-request'));

      expect(sent.status).toBe(200);
      expect(sent.body.reactivationStatus).toBe('requested');
      expect((await list(admin.accessToken)).body.items.map((item: { id: string }) => item.id)).toEqual([ana.id]);
    });
  });

  describe('denies', () => {
    it('keeps the account deleted, with the trimmed reason', async () => {
      const ana = await requested('2026-10-05T10:00:00.000Z');

      const response = await deny(admin.accessToken, ana.id, { reason: '  Turmas cheias.  ' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: ana.id, decision: 'denied' });
      const profile = await me(ana.accessToken);
      expect(profile.body).toMatchObject({
        status: 'deleted',
        reactivationStatus: 'denied',
        denialReason: 'Turmas cheias.',
      });
      await as(ana.accessToken, http().post('/auth/me/reactivation-request'))
        .expect(409)
        .expect((res) => expect(res.body.errors).toEqual(['user.reactivation.denied']));
      expect((await list(admin.accessToken)).body.items).toEqual([]);
    });

    it.each([undefined, {}, { reason: null }, { reason: '   ' }])('denies without a reason (%j)', async (body) => {
      const ana = await requested('2026-10-05T10:00:00.000Z');

      await deny(admin.accessToken, ana.id, body).expect(200);

      const profile = await me(ana.accessToken);
      expect(profile.body).toMatchObject({ reactivationStatus: 'denied', denialReason: null });
    });

    it('refuses a reason that is not a string', async () => {
      const ana = await requested('2026-10-05T10:00:00.000Z');

      const response = await deny(admin.accessToken, ana.id, { reason: 42 });

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(['reactivation.reason.invalid']);
      expect((await rowOf(ana.id)).reactivationStatus).toBe('requested');
    });

    it('refuses 501 characters and changes nothing', async () => {
      const ana = await requested('2026-10-05T10:00:00.000Z');

      const response = await deny(admin.accessToken, ana.id, { reason: 'x'.repeat(501) });

      expect(response.status).toBe(422);
      expect(response.body.errors).toContain('user.denialReason.max.length');
      const row = await rowOf(ana.id);
      expect(row.reactivationStatus).toBe('requested');
      expect(row.denialReason).toBeNull();
    });
  });

  describe('refuses', () => {
    it('answers 403 to a student or an instructor and to a pending admin', async () => {
      const ana = await requested('2026-10-05T10:00:00.000Z');
      const student = await account('student');
      const instructor = await account('instructor');
      const pending = await account('admin', 'pending');
      await device(ana.id);

      for (const caller of [student, instructor]) {
        for (const response of [
          await list(caller.accessToken),
          await approve(caller.accessToken, ana.id),
          await deny(caller.accessToken, ana.id),
        ]) {
          expect(response.status).toBe(403);
          expect(response.body.errors).toEqual(['user.role.notAdmin']);
        }
      }
      for (const response of [
        await list(pending.accessToken),
        await approve(pending.accessToken, ana.id),
        await deny(pending.accessToken, ana.id),
      ]) {
        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual(['user.status.notApproved']);
      }
      expect((await rowOf(ana.id)).reactivationStatus).toBe('requested');
      expect(await rowsOf(ana.id)).toHaveLength(0);
      expect(push.sent).toHaveLength(0);
    });

    it('answers 401 without a token', async () => {
      const ana = await requested('2026-10-05T10:00:00.000Z');

      await list().expect(401);
      await approve(undefined, ana.id).expect(401);
      await deny(undefined, ana.id).expect(401);
    });

    it('answers 404 for an unknown id and one that is not a UUID', async () => {
      for (const id of [randomUUID(), 'abc']) {
        for (const response of [await approve(admin.accessToken, id), await deny(admin.accessToken, id)]) {
          expect(response.status).toBe(404);
          expect(response.body.errors).toEqual(['reactivation.notFound']);
        }
      }
    });

    it('answers 409 for an account that has no request to answer, and notifies nobody', async () => {
      const waiting = [
        await account('student', 'approved'),
        await account('student', 'removed'),
        await account('student', 'deleted'),
        await account('student', 'deleted', {
          reactivationStatus: 'denied',
          reactivationRequestedAt: new Date('2026-10-02T10:00:00.000Z'),
        }),
      ];
      for (const person of waiting) {
        await device(person.id);
      }

      for (const person of waiting) {
        for (const response of [await approve(admin.accessToken, person.id), await deny(admin.accessToken, person.id)]) {
          expect(response.status).toBe(409);
          expect(response.body.errors).toEqual(['reactivation.status.notRequested']);
        }
        expect(await rowsOf(person.id)).toHaveLength(0);
      }
      expect((await rowOf(waiting[2]!.id)).status).toBe('deleted');
      expect(push.sent).toHaveLength(0);
    });

    it('leaves exactly one decision when an approval and a denial arrive together', async () => {
      const second = await account('admin');
      const ana = await requested('2026-10-05T10:00:00.000Z');

      const [approved, denied] = await Promise.all([
        approve(admin.accessToken, ana.id),
        deny(second.accessToken, ana.id, { reason: 'Turmas cheias.' }),
      ]);

      expect([approved.status, denied.status].sort()).toEqual([200, 409]);
      const row = await rowOf(ana.id);
      if (approved.status === 200) {
        expect(row).toMatchObject({ status: 'approved', reactivationStatus: null, denialReason: null });
        expect(denied.body.errors).toEqual(['reactivation.status.notRequested']);
        expect(await rowsOf(ana.id, 'reactivation.denied')).toHaveLength(0);
      } else {
        expect(row).toMatchObject({ status: 'deleted', reactivationStatus: 'denied', denialReason: 'Turmas cheias.' });
        expect(approved.body.errors).toEqual(['reactivation.status.notRequested']);
        expect(await rowsOf(ana.id, 'reactivation.approved')).toHaveLength(0);
      }
    });
  });

  describe('notifies', () => {
    it('tells each approved admin, and only them, when a deleted account asks for the first time', async () => {
      const second = await account('admin');
      const pendingAdmin = await account('admin', 'pending');
      const student = await account('student');
      const t1 = await device(admin.id, 'pt-BR');
      await device(pendingAdmin.id);
      await device(student.id);
      const ana = await account('student', 'deleted', { name: 'Ana Souza' });

      await as(ana.accessToken, http().post('/auth/me/reactivation-request')).expect(200);

      for (const recipient of [admin, second]) {
        const rows = await rowsOf(recipient.id);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
          type: 'reactivation.requested',
          params: { name: 'Ana Souza', userId: ana.id },
        });
      }
      expect(await rowsOf(pendingAdmin.id)).toHaveLength(0);
      expect(await rowsOf(student.id)).toHaveLength(0);
      expect(push.sent).toHaveLength(1);
      expect(push.sent[0]).toMatchObject({ token: t1.token, type: 'reactivation.requested' });
      expect(renderPush(push.sent[0]!.type, push.sent[0]!.params, push.sent[0]!.locale)).toEqual({
        title: 'Pedido de reativação',
        body: 'Ana Souza quer voltar para a escola.',
      });
    });

    it('does not notify again for a repeated request, nor for one refused after a denial', async () => {
      const again = await account('student', 'deleted');
      const denied = await account('student', 'deleted', {
        reactivationStatus: 'denied',
        reactivationRequestedAt: new Date('2026-10-02T10:00:00.000Z'),
      });
      await device(admin.id);

      await as(again.accessToken, http().post('/auth/me/reactivation-request')).expect(200);
      expect(await rowsOf(admin.id)).toHaveLength(1);
      await as(again.accessToken, http().post('/auth/me/reactivation-request')).expect(200);
      await as(denied.accessToken, http().post('/auth/me/reactivation-request')).expect(409);

      expect(await rowsOf(admin.id)).toHaveLength(1);
      expect(push.sent).toHaveLength(1);
    });

    it('tells the person when the request is approved', async () => {
      const ana = await requested('2026-10-05T10:00:00.000Z');
      const token = await device(ana.id, 'pt-BR');

      await approve(admin.accessToken, ana.id).expect(200);

      const rows = await rowsOf(ana.id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ type: 'reactivation.approved', params: {} });
      expect(push.sent).toHaveLength(1);
      expect(push.sent[0]).toMatchObject({ token: token.token });
      expect(renderPush(push.sent[0]!.type, push.sent[0]!.params, push.sent[0]!.locale)).toEqual({
        title: 'Conta reativada',
        body: 'Você já pode voltar a usar o app.',
      });
      expect(await rowsOf(admin.id)).toHaveLength(0);
    });

    it('tells the person when the request is denied, with the reason or the fallback', async () => {
      const withReason = await requested('2026-10-05T10:00:00.000Z');
      const without = await requested('2026-10-06T10:00:00.000Z');
      await device(withReason.id, 'pt-BR');
      await device(without.id, 'en');

      await deny(admin.accessToken, withReason.id, { reason: ' Turmas cheias. ' }).expect(200);
      await deny(admin.accessToken, without.id).expect(200);

      expect((await rowsOf(withReason.id))[0]).toMatchObject({
        type: 'reactivation.denied',
        params: { reason: 'Turmas cheias.' },
      });
      expect((await rowsOf(without.id))[0]).toMatchObject({ type: 'reactivation.denied', params: {} });
      const texts = push.sent.map((message) => renderPush(message.type, message.params, message.locale));
      expect(texts).toEqual([
        { title: 'Reativação recusada', body: 'Turmas cheias.' },
        { title: 'Reactivation denied', body: 'Open the app to learn more.' },
      ]);
    });

    it('keeps the 200 when the push fails', async () => {
      const ana = await requested('2026-10-05T10:00:00.000Z');
      await device(ana.id);
      push.failing = true;

      const response = await approve(admin.accessToken, ana.id);

      expect(response.status).toBe(200);
      expect((await rowOf(ana.id)).status).toBe('approved');
    });
  });
});
