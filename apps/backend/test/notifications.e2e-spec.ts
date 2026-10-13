import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  EmailProvider,
  GoogleIdTokenPayload,
  SendSignInCodeIn,
} from '@rochas-surf-school/auth';
import type {
  PushMessage,
  PushReceipt,
  PushSendTicket,
} from '@rochas-surf-school/notifications';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/db/prisma.service.js';
import { GoogleAuthIdTokenProvider } from '../src/modules/auth/google.id-token.js';
import { JwtTokenProvider } from '../src/modules/auth/jwt.token.js';
import { ResendEmailProvider } from '../src/modules/auth/resend.email.js';
import { ExpoPushProvider } from '../src/modules/notifications/expo.push.js';
import { renderPush } from '../src/modules/notifications/push-messages.js';

// Secrets the backend refuses to start without; CI has no .env.
process.env.AUTH_CODE_PEPPER ??= 'e2e-pepper';
process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';

const DOMAIN = 'notifications.e2e.example.com';
const TOKEN_MARK = 'e2e-notif';

type Role = 'student' | 'instructor' | 'admin';
type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';

/** Records the pushes instead of calling Expo; the tickets and the failure are configurable. */
class FakePushProvider {
  sent: PushMessage[] = [];
  tickets = new Map<string, PushSendTicket>();
  receipts: Record<string, PushReceipt> = {};
  failing = false;

  async send(messages: PushMessage[]): Promise<PushSendTicket[]> {
    this.sent.push(...messages);
    if (this.failing) {
      throw new Error('expo unavailable');
    }
    return messages.map(
      (message) =>
        this.tickets.get(message.token) ?? { status: 'ok', id: `ticket-${randomUUID()}` },
    );
  }

  async getReceipts(): Promise<Record<string, PushReceipt>> {
    return this.receipts;
  }
}

class CapturingEmailProvider implements EmailProvider {
  readonly sent: SendSignInCodeIn[] = [];

  async sendSignInCode(input: SendSignInCodeIn): Promise<void> {
    this.sent.push(input);
  }
}

class FakeGoogleIdTokenProvider {
  readonly payloads = new Map<string, GoogleIdTokenPayload>();

  async verify(idToken: string): Promise<GoogleIdTokenPayload> {
    const payload = this.payloads.get(idToken);
    if (!payload) {
      throw new Error('invalid token');
    }
    return payload;
  }
}

interface Account {
  id: string;
  email: string;
  accessToken: string;
}

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: JwtTokenProvider;
  let push: FakePushProvider;
  let email: CapturingEmailProvider;
  let google: FakeGoogleIdTokenProvider;

  beforeEach(async () => {
    push = new FakePushProvider();
    email = new CapturingEmailProvider();
    google = new FakeGoogleIdTokenProvider();
    const moduleRef = await Test.createTestingModule({
      imports: [(await import('../src/app.module.js')).AppModule],
    })
      .overrideProvider(ExpoPushProvider)
      .useValue(push)
      .overrideProvider(ResendEmailProvider)
      .useValue(email)
      .overrideProvider(GoogleAuthIdTokenProvider)
      .useValue(google)
      .compile();
    app = moduleRef.createNestApplication<INestApplication<App>>();
    await app.init();
    prisma = app.get(PrismaService);
    tokens = app.get(JwtTokenProvider, { strict: false });
  });

  afterEach(async () => {
    // Notifications and push tokens go with their user (onDelete: Cascade); tickets have no foreign key.
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await prisma.pushTicket.deleteMany({ where: { token: { contains: TOKEN_MARK } } });
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const as = (token: string | undefined, req: request.Test) =>
    token === undefined ? req : req.set('Authorization', `Bearer ${token}`);
  const unique = (prefix: string) => `${prefix}.${randomUUID().slice(0, 8)}@${DOMAIN}`;
  const pushToken = (name: string) => `ExponentPushToken[${TOKEN_MARK}-${name}-${randomUUID().slice(0, 8)}]`;

  async function account(role: Role = 'student', status: Status = 'approved'): Promise<Account> {
    const user = await prisma.user.create({
      data: { id: randomUUID(), name: `Ana ${role}`, email: unique(role), role, status },
    });
    return { id: user.id, email: user.email, accessToken: tokens.signAccessToken(user).token };
  }

  const register = (token: string | undefined, body?: object) => {
    const req = as(token, http().put('/notifications/push-token'));
    return body === undefined ? req : req.send(body);
  };

  /** Registers a device straight in the database, as a signed-in phone would have. */
  const device = (userId: string, token: string, locale = 'en') =>
    prisma.pushToken.create({ data: { token, userId, locale } });

  const rowsOf = (userId: string, type?: string) =>
    prisma.notification.findMany({ where: { userId, ...(type ? { type } : {}) } });

  async function signIn(address: string): Promise<{ refreshToken: string }> {
    await http().post('/auth/email/code').send({ email: address }).expect(202);
    const code = email.sent.at(-1)!.code;
    const response = await http().post('/auth/email/verify').send({ email: address, code }).expect(200);
    return response.body as { refreshToken: string };
  }

  /** Signs up a new account through the email flow; returns the response. */
  async function signUp(address: string, name: string) {
    await http().post('/auth/email/code').send({ email: address }).expect(202);
    const code = email.sent.at(-1)!.code;
    return http().post('/auth/email/verify').send({ email: address, code, name });
  }

  describe('PUT /notifications/push-token', () => {
    it('registers', async () => {
      const user = await account('student', 'approved');

      const response = await register(user.accessToken, { token: 'ExponentPushToken[abc]'.replace('abc', `${TOKEN_MARK}-1`), locale: 'es' });

      expect(response.status).toBe(204);
      expect(response.text).toBe('');
      const rows = await prisma.pushToken.findMany({ where: { userId: user.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ userId: user.id, locale: 'es' });
    });

    it('registers for a pending account and accepts the ExpoPushToken form', async () => {
      const user = await account('student', 'pending');
      const token = `ExpoPushToken[${TOKEN_MARK}-2]`;

      await register(user.accessToken, { token, locale: 'pt-BR' }).expect(204);

      expect(await prisma.pushToken.findUnique({ where: { token } })).toMatchObject({ userId: user.id });
    });

    it('updates the locale', async () => {
      const user = await account();
      const token = pushToken('locale');

      await register(user.accessToken, { token, locale: 'es' }).expect(204);
      await register(user.accessToken, { token, locale: 'en' }).expect(204);

      const rows = await prisma.pushToken.findMany({ where: { userId: user.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0]!.locale).toBe('en');
    });

    it('moves the token to the new user', async () => {
      const first = await account();
      const second = await account();
      const token = pushToken('moved');

      await register(first.accessToken, { token, locale: 'en' }).expect(204);
      await register(second.accessToken, { token, locale: 'pt-BR' }).expect(204);

      const rows = await prisma.pushToken.findMany({ where: { token } });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ userId: second.id, locale: 'pt-BR' });
    });

    it('keeps several devices', async () => {
      const user = await account();

      await register(user.accessToken, { token: pushToken('a'), locale: 'en' }).expect(204);
      await register(user.accessToken, { token: pushToken('b'), locale: 'en' }).expect(204);

      expect(await prisma.pushToken.count({ where: { userId: user.id } })).toBe(2);
    });

    it('refuses without a token', async () => {
      const response = await register(undefined, { token: pushToken('x'), locale: 'en' });

      expect(response.status).toBe(401);
      expect(response.body.errors).toEqual(['auth.token.invalid']);
    });

    it.each(['denied', 'deleted', 'removed'] as const)('refuses a %s account', async (status) => {
      const user = await account('student', status);

      // A 403 is answered before any body check, so the invalid body doesn't turn it into a 422.
      const response = await register(user.accessToken, { token: 'nope', locale: 'fr' });

      expect(response.status).toBe(403);
      expect(response.body.errors).toEqual(['pushToken.status.notAllowed']);
      expect(await prisma.pushToken.count({ where: { userId: user.id } })).toBe(0);
    });

    it('refuses an invalid token and locale, listing both keys', async () => {
      const user = await account();

      const response = await register(user.accessToken, { token: 'abc', locale: 'fr' });

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(['pushToken.token.invalid', 'pushToken.locale.invalid']);
      await register(user.accessToken, { locale: 'en' }).expect(422);
      await register(user.accessToken).expect(422);
      expect(await prisma.pushToken.count({ where: { userId: user.id } })).toBe(0);
    });
  });

  describe('sign-out', () => {
    it("removes the caller's token", async () => {
      const user = await account();
      const session = await signIn(user.email);
      const token = pushToken('out');
      await device(user.id, token);

      await http().post('/auth/sign-out').send({ refreshToken: session.refreshToken, pushToken: token }).expect(204);

      expect(await prisma.pushToken.count({ where: { token } })).toBe(0);
    });

    it("keeps another user's token", async () => {
      const user = await account();
      const other = await account();
      const session = await signIn(user.email);
      const token = pushToken('other');
      await device(other.id, token);

      await http().post('/auth/sign-out').send({ refreshToken: session.refreshToken, pushToken: token }).expect(204);

      expect(await prisma.pushToken.count({ where: { token } })).toBe(1);
    });

    it('removes it when the refresh token was already revoked, and ignores an unknown one', async () => {
      const user = await account();
      const session = await signIn(user.email);
      const token = pushToken('revoked');
      await device(user.id, token);
      await http().post('/auth/sign-out').send({ refreshToken: session.refreshToken }).expect(204);
      expect(await prisma.pushToken.count({ where: { token } })).toBe(1);

      await http().post('/auth/sign-out').send({ refreshToken: 'never-issued', pushToken: token }).expect(204);
      expect(await prisma.pushToken.count({ where: { token } })).toBe(1);

      await http().post('/auth/sign-out').send({ refreshToken: session.refreshToken, pushToken: token }).expect(204);
      expect(await prisma.pushToken.count({ where: { token } })).toBe(0);
    });

    it.each([{}, { pushToken: '' }, { pushToken: 42 }])('ignores a missing push token (%j)', async (extra) => {
      const user = await account();
      const session = await signIn(user.email);
      const token = pushToken('kept');
      await device(user.id, token);

      await http().post('/auth/sign-out').send({ refreshToken: session.refreshToken, ...extra }).expect(204);

      expect(await prisma.pushToken.count({ where: { token } })).toBe(1);
      expect(
        await prisma.refreshToken.count({ where: { userId: user.id, revokedAt: null } }),
      ).toBe(0);
    });
  });

  describe('registration pending', () => {
    it('notifies every approved admin of a new account created by email', async () => {
      const a1 = await account('admin', 'approved');
      const a2 = await account('admin', 'approved');
      const t1 = pushToken('a1');
      await device(a1.id, t1, 'pt-BR');
      const address = unique('ana');

      const response = await signUp(address, 'Ana Souza');

      expect(response.status).toBe(200);
      expect(response.body.user).toMatchObject({ name: 'Ana Souza', status: 'pending' });
      for (const admin of [a1, a2]) {
        const rows = await rowsOf(admin.id);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ type: 'registration.pending', params: { name: 'Ana Souza' } });
      }
      expect(push.sent).toHaveLength(1);
      const [message] = push.sent;
      expect(message).toMatchObject({
        token: t1,
        type: 'registration.pending',
        notificationId: (await rowsOf(a1.id))[0]!.id,
      });
      expect(renderPush(message!.type, message!.params, message!.locale)).toEqual({
        title: 'Nova inscrição',
        body: 'Ana Souza está aguardando aprovação.',
      });
    });

    it('notifies the admins of a new account created with Google', async () => {
      const admin = await account('admin', 'approved');
      await device(admin.id, pushToken('g'), 'en');
      const address = unique('maria');
      google.payloads.set('good', { sub: randomUUID(), email: address, emailVerified: true, name: 'Maria Silva' });

      await http().post('/auth/google').send({ idToken: 'good' }).expect(200);

      expect(await rowsOf(admin.id, 'registration.pending')).toHaveLength(1);
      expect(push.sent).toHaveLength(1);
    });

    it('notifies nobody when an existing account signs in, whatever its status', async () => {
      const admin = await account('admin', 'approved');
      await device(admin.id, pushToken('quiet'));
      for (const status of ['pending', 'approved', 'denied'] as const) {
        const existing = await account('student', status);
        await signIn(existing.email);
      }

      expect(await rowsOf(admin.id)).toHaveLength(0);
      expect(push.sent).toHaveLength(0);
    });

    it('notifies only approved admins', async () => {
      const others = [
        await account('admin', 'pending'),
        await account('admin', 'denied'),
        await account('admin', 'removed'),
        await account('student', 'approved'),
        await account('instructor', 'approved'),
      ];
      for (const [index, other] of others.entries()) {
        await device(other.id, pushToken(`o${index}`));
      }

      await signUp(unique('bia'), 'Bia Souza');

      for (const other of others) {
        expect(await rowsOf(other.id)).toHaveLength(0);
      }
      expect(push.sent).toHaveLength(0);
    });
  });

  describe('registration decided', () => {
    it('approval', async () => {
      const admin = await account('admin', 'approved');
      const person = await account('student', 'pending');
      const t1 = pushToken('en');
      const t2 = pushToken('es');
      await device(person.id, t1, 'en');
      await device(person.id, t2, 'es');

      const response = await http()
        .post(`/registrations/${person.id}/approve`)
        .set('Authorization', `Bearer ${admin.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: person.id, status: 'approved' });
      const rows = await rowsOf(person.id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ type: 'registration.approved', params: {} });
      const texts = Object.fromEntries(
        push.sent.map((message) => [message.token, renderPush(message.type, message.params, message.locale)]),
      );
      expect(texts).toEqual({
        [t1]: { title: 'Account approved', body: 'You can start using the app now.' },
        [t2]: { title: 'Cuenta aprobada', body: 'Ya puedes empezar a usar la app.' },
      });
    });

    it('denial with a reason', async () => {
      const admin = await account('admin', 'approved');
      const person = await account('student', 'pending');
      const token = pushToken('pt');
      await device(person.id, token, 'pt-BR');

      const response = await http()
        .post(`/registrations/${person.id}/deny`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ reason: '  Não conhecemos você.  ' });

      expect(response.status).toBe(200);
      const rows = await rowsOf(person.id);
      expect(rows[0]).toMatchObject({ type: 'registration.denied', params: { reason: 'Não conhecemos você.' } });
      expect(push.sent).toHaveLength(1);
      expect(renderPush(push.sent[0]!.type, push.sent[0]!.params, push.sent[0]!.locale)).toEqual({
        title: 'Inscrição recusada',
        body: 'Não conhecemos você.',
      });
    });

    it.each([undefined, { reason: null }, { reason: '   ' }])('denial without a reason (%j)', async (body) => {
      const admin = await account('admin', 'approved');
      const person = await account('student', 'pending');
      await device(person.id, pushToken('nr'), 'pt-BR');

      const req = http().post(`/registrations/${person.id}/deny`).set('Authorization', `Bearer ${admin.accessToken}`);
      await (body === undefined ? req : req.send(body)).expect(200);

      expect((await rowsOf(person.id))[0]).toMatchObject({ type: 'registration.denied', params: {} });
      expect(renderPush(push.sent[0]!.type, push.sent[0]!.params, push.sent[0]!.locale).body).toBe(
        'Abra o app para saber mais.',
      );
    });

    it('stores and sends nothing when the decision is refused, not found, in conflict or invalid', async () => {
      const admin = await account('admin', 'approved');
      const student = await account('student', 'approved');
      const decided = await account('student', 'approved');
      const pending = await account('student', 'pending');
      await device(pending.id, pushToken('p'));
      await device(decided.id, pushToken('d'));
      const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

      await http().post(`/registrations/${pending.id}/approve`).set(auth(student.accessToken)).expect(403);
      await http().post(`/registrations/${randomUUID()}/approve`).set(auth(admin.accessToken)).expect(404);
      await http().post(`/registrations/${decided.id}/deny`).set(auth(admin.accessToken)).send({ reason: 'x' }).expect(409);
      await http().post(`/registrations/${pending.id}/deny`).set(auth(admin.accessToken)).send({ reason: 5 }).expect(422);
      await http().post(`/registrations/${pending.id}/deny`).set(auth(admin.accessToken)).send({ reason: 'x'.repeat(501) }).expect(422);

      expect(await rowsOf(pending.id)).toHaveLength(0);
      expect(await rowsOf(decided.id)).toHaveLength(0);
      expect(push.sent).toHaveLength(0);
    });

    it('gives the person the stored notification only when they have no device', async () => {
      const admin = await account('admin', 'approved');
      const person = await account('student', 'pending');

      await http().post(`/registrations/${person.id}/approve`).set('Authorization', `Bearer ${admin.accessToken}`).expect(200);

      expect(await rowsOf(person.id, 'registration.approved')).toHaveLength(1);
      expect(push.sent).toHaveLength(0);
    });
  });

  describe('tickets', () => {
    it('removes a device Expo says is gone and keeps the ticket of the other', async () => {
      const admin = await account('admin', 'approved');
      const person = await account('student', 'pending');
      const gone = pushToken('gone');
      const alive = pushToken('alive');
      await device(person.id, gone);
      await device(person.id, alive);
      push.tickets.set(gone, { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } });
      push.tickets.set(alive, { status: 'ok', id: `r-${TOKEN_MARK}-${randomUUID()}` });

      await http().post(`/registrations/${person.id}/approve`).set('Authorization', `Bearer ${admin.accessToken}`).expect(200);

      expect(await prisma.pushToken.count({ where: { token: gone } })).toBe(0);
      expect(await prisma.pushToken.count({ where: { token: alive } })).toBe(1);
      const tickets = await prisma.pushTicket.findMany({ where: { token: { contains: TOKEN_MARK } } });
      expect(tickets.map((ticket) => ticket.token)).toEqual([alive]);
    });
  });

  describe('a failing notification', () => {
    it('push failure keeps the decision and the notification', async () => {
      const admin = await account('admin', 'approved');
      const person = await account('student', 'pending');
      await device(person.id, pushToken('fail'));
      push.failing = true;

      const response = await http()
        .post(`/registrations/${person.id}/approve`)
        .set('Authorization', `Bearer ${admin.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: person.id, status: 'approved' });
      expect((await prisma.user.findUniqueOrThrow({ where: { id: person.id } })).status).toBe('approved');
      expect(await rowsOf(person.id, 'registration.approved')).toHaveLength(1);
    });

    it('push failure on sign-up and denial still answers as before', async () => {
      const admin = await account('admin', 'approved');
      await device(admin.id, pushToken('fail-admin'));
      push.failing = true;

      const signUpResponse = await signUp(unique('cris'), 'Cris Souza');
      expect(signUpResponse.status).toBe(200);
      expect(await rowsOf(admin.id, 'registration.pending')).toHaveLength(1);

      const person = await account('student', 'pending');
      await device(person.id, pushToken('fail-person'));
      await http()
        .post(`/registrations/${person.id}/deny`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ reason: 'no' })
        .expect(200);
      expect(await rowsOf(person.id, 'registration.denied')).toHaveLength(1);
    });
  });
});
