import { randomUUID } from 'node:crypto';
import type { Mock } from 'vitest';
import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Identity, RefreshToken, SignInCode, User } from '@rochas-surf-school/auth';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator.js';
import { AuthConfig } from './auth.config.js';
import { AuthController } from './auth.controller.js';
import { GoogleAuthIdTokenProvider } from './google.id-token.js';
import { HmacSignInCodeProvider } from './hmac.sign-in-code.js';
import { PrismaIdentityRepository } from './identity.prisma.js';
import { JwtTokenProvider } from './jwt.token.js';
import { PrismaRefreshTokenRepository } from './refresh-token.prisma.js';
import { ResendEmailProvider } from './resend.email.js';
import { PrismaRulesVersionProvider } from './rules-version.prisma.js';
import { PrismaSignInCodeRepository } from './sign-in-code.prisma.js';
import { SystemClockProvider } from './system.clock.js';
import { NotificationsPushTokenRemover } from '../notifications/notifications.push-token-remover.js';
import { NotificationsRegistrationNotifier } from '../notifications/notifications.registration-notifier.js';
import { PrismaUserRepository } from './user.prisma.js';

const NOW = new Date('2026-10-07T12:00:00.000Z');

function handlerOf(name: keyof AuthController): object {
  return Object.getOwnPropertyDescriptor(AuthController.prototype, name)!.value as object;
}

function refreshTokenRepositoryOf(controller: AuthController) {
  return (controller as unknown as { refreshTokenRepository: { revokeFamily: Mock } })
    .refreshTokenRepository;
}

function setup(
  reviewCodes: Record<string, string> = {},
  users: User[] = [],
  rulesVersion = 0,
) {
  const codes = new Map<string, SignInCode>();
  const signInCodeRepository = {
    findByEmail: vi.fn(async (email: string) => codes.get(email) ?? null),
    save: vi.fn(async (code: SignInCode) => {
      codes.set(code.email, code);
      return code;
    }),
    deleteByEmail: vi.fn(async (email: string) => {
      codes.delete(email);
    }),
    incrementAttempts: vi.fn(),
    consume: vi.fn(async (email: string, codeHash: string) => {
      const ok = codes.get(email)?.codeHash === codeHash;
      if (ok) codes.delete(email);
      return ok;
    }),
  };
  const userRepository = {
    findById: vi.fn(async (id: string) => users.find((user) => user.id === id) ?? null),
    findByEmail: vi.fn(async (email: string) => users.find((user) => user.email === email) ?? null),
    create: vi.fn(async (user: User) => user),
    update: vi.fn(async (user: User) => {
      const index = users.findIndex((item) => item.id === user.id);
      if (index !== -1) users[index] = user;
      return user;
    }),
  };
  const identities: Identity[] = [];
  const identityRepository = {
    findByProvider: vi.fn(async () => null),
    findByUserId: vi.fn(async () => identities),
    create: vi.fn(async (identity: Identity) => {
      identities.push(identity);
      return identity;
    }),
  };
  const refreshTokens: RefreshToken[] = [];
  const refreshTokenRepository = {
    create: vi.fn(async (token: RefreshToken) => {
      refreshTokens.push(token);
      return token;
    }),
    findByTokenHash: vi.fn(
      async (hash: string) => refreshTokens.find((token) => token.tokenHash === hash) ?? null,
    ),
    rotate: vi.fn(async (id: string, next: RefreshToken, at: Date) => {
      const index = refreshTokens.findIndex((token) => token.id === id && !token.revokedAt);
      if (index === -1) return false;
      refreshTokens[index] = refreshTokens[index]!.clone({ revokedAt: at });
      refreshTokens.push(next);
      return true;
    }),
    revokeFamily: vi.fn(),
  };
  const tokenProvider = {
    signAccessToken: vi.fn(() => ({ token: 'access', expiresAt: new Date('2026-10-07T12:15:00.000Z') })),
    generateRefreshToken: vi.fn(() => ({ token: 'refresh', hash: 'f'.repeat(64) })),
    hashRefreshToken: vi.fn((token: string) => (token === 'refresh' ? 'f'.repeat(64) : '0'.repeat(64))),
  };
  const emailProvider = { sendSignInCode: vi.fn().mockResolvedValue(undefined) };
  const googleIdTokenProvider = {
    verify: vi.fn(async (idToken: string) => {
      if (idToken !== 'google-token') throw new Error('invalid token');
      return { sub: 'sub-1', email: 'Bia@Example.com', emailVerified: true, name: 'Bia Souza' };
    }),
  };
  const registrationNotifier = { registrationPending: vi.fn().mockResolvedValue(undefined) };
  const pushTokenRemover = { remove: vi.fn().mockResolvedValue(undefined) };
  const controller = new AuthController(
    { reviewCodes, refreshTokenTtlDays: 30 } as AuthConfig,
    signInCodeRepository as unknown as PrismaSignInCodeRepository,
    new HmacSignInCodeProvider({ codePepper: 'pepper' } as AuthConfig),
    emailProvider as unknown as ResendEmailProvider,
    { now: () => NOW } as SystemClockProvider,
    userRepository as unknown as PrismaUserRepository,
    identityRepository as unknown as PrismaIdentityRepository,
    refreshTokenRepository as unknown as PrismaRefreshTokenRepository,
    tokenProvider as unknown as JwtTokenProvider,
    { getCurrentVersion: vi.fn(async () => rulesVersion) } as unknown as PrismaRulesVersionProvider,
    googleIdTokenProvider as unknown as GoogleAuthIdTokenProvider,
    registrationNotifier as unknown as NotificationsRegistrationNotifier,
    pushTokenRemover as unknown as NotificationsPushTokenRemover,
  );
  return {
    controller,
    registrationNotifier,
    pushTokenRemover,
    codes,
    emailProvider,
    identities,
    refreshTokens,
    tokenProvider,
    googleIdTokenProvider,
  };
}

describe('AuthController', () => {
  describe('POST /auth/email/code', () => {
    it('is a public POST on email/code answering 202', () => {
      const handler = handlerOf('requestSignInCode');

      expect(Reflect.getMetadata(PATH_METADATA, AuthController)).toBe('auth');
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('email/code');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.ACCEPTED);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([ThrottlerGuard]);
      expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler)).toBe(5);
      expect(Reflect.getMetadata('THROTTLER:TTLdefault', handler)).toBe(60_000);
    });

    it('runs RequestSignInCode with the body', async () => {
      const { controller, codes, emailProvider } = setup();

      const result = await controller.requestSignInCode({ email: 'Ana@Example.com', locale: 'es' });

      expect(result).toEqual({
        resendAvailableAt: new Date('2026-10-07T12:00:30.000Z'),
        expiresAt: new Date('2026-10-07T12:10:00.000Z'),
      });
      expect(codes.has('ana@example.com')).toBe(true);
      expect(emailProvider.sendSignInCode).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'ana@example.com', locale: 'es' }),
      );
    });

    it('passes the review codes from the config', async () => {
      const { controller, emailProvider } = setup({ 'review.admin@example.com': '246810' });

      await controller.requestSignInCode({ email: 'review.admin@example.com' });

      expect(emailProvider.sendSignInCode).not.toHaveBeenCalled();
    });

    it('answers signInCode.email.invalid when there is no body', async () => {
      const { controller } = setup();

      await expect(controller.requestSignInCode(undefined)).rejects.toMatchObject({
        statusCode: 422,
        errors: [expect.objectContaining({ message: 'signInCode.email.invalid' })],
      });
    });
  });

  describe('POST /auth/email/verify', () => {
    const ana = new User({
      name: 'Ana Rocha',
      email: 'ana@example.com',
      whatsappVisible: false,
      role: 'student',
      status: 'approved',
    });

    it('is a public POST on email/verify answering 200', () => {
      const handler = handlerOf('verifySignInCode');

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('email/verify');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([ThrottlerGuard]);
      expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler)).toBe(10);
      expect(Reflect.getMetadata('THROTTLER:TTLdefault', handler)).toBe(60_000);
    });

    it('runs VerifySignInCode with StartSession and the configured TTL', async () => {
      const { controller, emailProvider, refreshTokens, identities } = setup({}, [ana]);
      await controller.requestSignInCode({ email: 'ana@example.com' });
      const code = (emailProvider.sendSignInCode.mock.calls[0]![0] as { code: string }).code;

      const result = await controller.verifySignInCode({ email: 'ana@example.com', code });

      expect(result).toEqual({
        accessToken: 'access',
        accessTokenExpiresAt: new Date('2026-10-07T12:15:00.000Z'),
        refreshToken: 'refresh',
        refreshTokenExpiresAt: new Date('2026-11-06T12:00:00.000Z'),
        user: {
          id: ana.id,
          name: 'Ana Rocha',
          email: 'ana@example.com',
          role: 'student',
          status: 'approved',
          createdAt: ana.createdAt,
          whatsappNumber: null,
          whatsappVisible: false,
          rulesAccepted: true,
          rulesAcceptedBefore: false,
          denialReason: null,
          reactivationStatus: null,
        },
      });
      expect(refreshTokens).toHaveLength(1);
      expect(identities).toHaveLength(1);
    });

    it('passes the name for a new account', async () => {
      const { controller, emailProvider, registrationNotifier } = setup();
      await controller.requestSignInCode({ email: 'bia@example.com' });
      const code = (emailProvider.sendSignInCode.mock.calls[0]![0] as { code: string }).code;

      const result = await controller.verifySignInCode({
        email: 'bia@example.com',
        code,
        name: 'Bia Souza',
      });

      expect(result.user).toMatchObject({ name: 'Bia Souza', status: 'pending', role: 'student' });
      expect(registrationNotifier.registrationPending).toHaveBeenCalledWith({
        id: result.user.id,
        name: 'Bia Souza',
      });
    });

    it('answers signInCode.code.invalid when there is no body', async () => {
      const { controller } = setup();

      await expect(controller.verifySignInCode(undefined)).rejects.toMatchObject({
        statusCode: 401,
        message: 'signInCode.code.invalid',
      });
    });
  });

  describe('POST /auth/google', () => {
    it('is a public POST on google answering 200', () => {
      const handler = handlerOf('signInWithGoogle');

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('google');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([ThrottlerGuard]);
      expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler)).toBe(10);
      expect(Reflect.getMetadata('THROTTLER:TTLdefault', handler)).toBe(60_000);
    });

    it('runs SignInWithGoogle with StartSession and the configured TTL', async () => {
      const { controller, identities, refreshTokens, registrationNotifier } = setup();

      const result = await controller.signInWithGoogle({ idToken: 'google-token' });

      expect(registrationNotifier.registrationPending).toHaveBeenCalledWith({
        id: result.user.id,
        name: 'Bia Souza',
      });
      expect(result).toMatchObject({
        accessToken: 'access',
        refreshToken: 'refresh',
        refreshTokenExpiresAt: new Date('2026-11-06T12:00:00.000Z'),
        user: { name: 'Bia Souza', email: 'bia@example.com', status: 'pending', role: 'student' },
      });
      expect(identities).toHaveLength(1);
      expect(refreshTokens).toHaveLength(1);
    });

    it('passes the name from the body', async () => {
      const { controller } = setup();

      const result = await controller.signInWithGoogle({
        idToken: 'google-token',
        name: 'Bia Costa',
      });

      expect(result.user.name).toBe('Bia Costa');
    });

    it('answers idToken.token.required when there is no body', async () => {
      const { controller, googleIdTokenProvider } = setup();

      await expect(controller.signInWithGoogle(undefined)).rejects.toMatchObject({
        statusCode: 422,
        errors: [expect.objectContaining({ message: 'idToken.token.required' })],
      });
      expect(googleIdTokenProvider.verify).not.toHaveBeenCalled();
    });

    it('answers auth.google.tokenInvalid for a token Google refuses', async () => {
      const { controller } = setup();

      await expect(controller.signInWithGoogle({ idToken: 'other' })).rejects.toMatchObject({
        statusCode: 401,
        message: 'auth.google.tokenInvalid',
      });
    });
  });

  describe('GET /auth/me', () => {
    const ana = new User({
      name: 'Ana Rocha',
      email: 'ana@example.com',
      whatsappVisible: false,
      role: 'instructor',
      status: 'pending',
    });

    it('is a protected GET on me answering 200', () => {
      const handler = handlerOf('me');

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('me');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    });

    it('runs GetCurrentUser for the signed-in account', async () => {
      const { controller } = setup({}, [ana]);

      await expect(controller.me(ana.id)).resolves.toEqual({
        id: ana.id,
        name: 'Ana Rocha',
        email: 'ana@example.com',
        role: 'instructor',
        status: 'pending',
        createdAt: ana.createdAt,
        whatsappNumber: null,
        whatsappVisible: false,
        rulesAccepted: true,
        rulesAcceptedBefore: false,
        denialReason: null,
        reactivationStatus: null,
      });
    });

    it('says the rules are not accepted when the current version wasn\'t', async () => {
      const { controller } = setup({}, [ana], 2);

      await expect(controller.me(ana.id)).resolves.toMatchObject({ rulesAccepted: false });
    });

    it('answers auth.token.invalid when the account is gone', async () => {
      const { controller } = setup();

      await expect(controller.me(ana.id)).rejects.toMatchObject({
        statusCode: 401,
        message: 'auth.token.invalid',
      });
    });
  });

  describe('DELETE /auth/me', () => {
    it('is a protected DELETE on me answering 204', () => {
      const handler = handlerOf('deleteAccount');

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('me');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.DELETE);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.NO_CONTENT);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    });

    it('closes the account of the signed-in user', async () => {
      const ana = new User({
        name: 'Ana Souza',
        email: 'ana@example.com',
        whatsappVisible: false,
        role: 'student',
        status: 'approved',
      });
      const users = [ana];
      const { controller } = setup({}, users);

      await expect(controller.deleteAccount(ana.id)).resolves.toBeUndefined();

      expect(users[0]!.status).toBe('deleted');
    });
  });

  describe('PUT /auth/me/name', () => {
    const approved = () =>
      new User({
        name: 'Ana Souza',
        email: 'ana@example.com',
        whatsappVisible: false,
        role: 'student',
        status: 'approved',
      });

    it('is a protected PUT on me/name answering 200', () => {
      const handler = handlerOf('setName');

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('me/name');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.PUT);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    });

    it('runs SetName for the signed-in account', async () => {
      const ana = approved();
      const { controller } = setup({}, [ana]);

      await expect(controller.setName(ana.id, { name: '  Ana Clara Souza ' })).resolves.toMatchObject({
        id: ana.id,
        name: 'Ana Clara Souza',
        email: 'ana@example.com',
      });
    });

    it('answers 422 when there is no body', async () => {
      const ana = approved();
      const { controller } = setup({}, [ana]);

      await expect(controller.setName(ana.id, undefined)).rejects.toMatchObject({
        statusCode: 422,
        errors: [expect.objectContaining({ message: 'user.name.required' })],
      });
    });
  });

  describe('PUT /auth/me/whatsapp', () => {
    const approved = () =>
      new User({
        name: 'Ana Rocha',
        email: 'ana@example.com',
        whatsappVisible: false,
        role: 'student',
        status: 'approved',
      });

    it('is a protected PUT on me/whatsapp answering 200', () => {
      const handler = handlerOf('setWhatsapp');

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('me/whatsapp');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.PUT);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    });

    it('runs SetWhatsapp for the signed-in account', async () => {
      const ana = approved();
      const { controller } = setup({}, [ana]);

      await expect(
        controller.setWhatsapp(ana.id, { whatsappNumber: '+5585999998888', whatsappVisible: true }),
      ).resolves.toEqual({
        id: ana.id,
        name: 'Ana Rocha',
        email: 'ana@example.com',
        role: 'student',
        status: 'approved',
        createdAt: ana.createdAt,
        whatsappNumber: '+5585999998888',
        whatsappVisible: true,
        rulesAccepted: true,
        rulesAcceptedBefore: false,
        denialReason: null,
        reactivationStatus: null,
      });
    });

    it('says the rules are not accepted when the current version wasn\'t', async () => {
      const ana = approved();
      const { controller } = setup({}, [ana], 2);

      await expect(
        controller.setWhatsapp(ana.id, { whatsappNumber: '+5585999998888', whatsappVisible: true }),
      ).resolves.toMatchObject({ rulesAccepted: false });
    });

    it('answers 422 when there is no body', async () => {
      const ana = approved();
      const { controller } = setup({}, [ana]);

      await expect(controller.setWhatsapp(ana.id, undefined)).rejects.toMatchObject({
        statusCode: 422,
        errors: [expect.objectContaining({ message: 'user.whatsappNumber.required' })],
      });
    });
  });

  describe('POST /auth/me/reactivation-request', () => {
    const deleted = (reactivationStatus?: 'requested' | 'denied') =>
      new User({
        name: 'Ana Rocha',
        email: 'ana@example.com',
        whatsappVisible: false,
        role: 'student',
        status: 'deleted',
        reactivationStatus,
      });

    it('is a protected POST on me/reactivation-request answering 200', () => {
      const handler = handlerOf('requestReactivation');

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('me/reactivation-request');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    });

    it('runs RequestReactivation for the signed-in account with the clock', async () => {
      const ana = deleted();
      const users = [ana];
      const { controller } = setup({}, users);

      await expect(controller.requestReactivation(ana.id)).resolves.toEqual({
        id: ana.id,
        name: 'Ana Rocha',
        email: 'ana@example.com',
        role: 'student',
        status: 'deleted',
        createdAt: ana.createdAt,
        whatsappNumber: null,
        whatsappVisible: false,
        rulesAccepted: true,
        rulesAcceptedBefore: false,
        denialReason: null,
        reactivationStatus: 'requested',
      });
      expect(users[0]!.reactivationRequestedAt).toEqual(NOW);
    });

    it('answers 409 user.reactivation.denied after a denial', async () => {
      const ana = deleted('denied');
      const { controller } = setup({}, [ana]);

      await expect(controller.requestReactivation(ana.id)).rejects.toMatchObject({
        statusCode: 409,
        message: 'user.reactivation.denied',
      });
    });

    it('answers 403 user.status.notDeleted for an account that is not deleted', async () => {
      const ana = new User({
        name: 'Ana Rocha',
        email: 'ana@example.com',
        whatsappVisible: false,
        role: 'student',
        status: 'approved',
      });
      const { controller } = setup({}, [ana]);

      await expect(controller.requestReactivation(ana.id)).rejects.toMatchObject({
        statusCode: 403,
        message: 'user.status.notDeleted',
      });
    });
  });

  describe('POST /auth/refresh', () => {
    const ana = new User({
      name: 'Ana Rocha',
      email: 'ana@example.com',
      whatsappVisible: false,
      role: 'student',
      status: 'approved',
    });

    it('is a public throttled POST on refresh answering 200', () => {
      const handler = handlerOf('refreshSession');

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('refresh');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([ThrottlerGuard]);
      expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler)).toBe(10);
      expect(Reflect.getMetadata('THROTTLER:TTLdefault', handler)).toBe(60_000);
    });

    it('runs RefreshSession with the body and the configured TTL', async () => {
      const { controller, refreshTokens } = setup({}, [ana]);
      refreshTokens.push(
        new RefreshToken({
          userId: ana.id,
          tokenHash: 'f'.repeat(64),
          familyId: randomUUID(),
          expiresAt: new Date('2026-11-06T12:00:00.000Z'),
        }),
      );

      const result = await controller.refreshSession({ refreshToken: 'refresh' });

      expect(result).toMatchObject({
        accessToken: 'access',
        refreshToken: 'refresh',
        refreshTokenExpiresAt: new Date('2026-11-06T12:00:00.000Z'),
        user: { id: ana.id, status: 'approved' },
      });
      expect(refreshTokens).toHaveLength(2);
      expect(refreshTokens[0]!.revokedAt).toEqual(NOW);
    });

    it('answers refreshToken.token.required when there is no body', async () => {
      const { controller } = setup();

      await expect(controller.refreshSession(undefined)).rejects.toMatchObject({
        statusCode: 422,
        errors: [expect.objectContaining({ message: 'refreshToken.token.required' })],
      });
    });
  });

  describe('POST /auth/sign-out', () => {
    it('is a public throttled POST on sign-out answering 204', () => {
      const handler = handlerOf('signOut');

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('sign-out');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.NO_CONTENT);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([ThrottlerGuard]);
      expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler)).toBe(10);
      expect(Reflect.getMetadata('THROTTLER:TTLdefault', handler)).toBe(60_000);
    });

    it('runs SignOut: revokes the family of the sent token', async () => {
      const { controller, refreshTokens } = setup();
      const familyId = randomUUID();
      refreshTokens.push(
        new RefreshToken({
          userId: randomUUID(),
          tokenHash: 'f'.repeat(64),
          familyId,
          expiresAt: new Date('2026-11-06T12:00:00.000Z'),
        }),
      );

      await expect(controller.signOut({ refreshToken: 'refresh' })).resolves.toBeUndefined();

      expect(refreshTokenRepositoryOf(controller).revokeFamily).toHaveBeenCalledWith(familyId, NOW);
    });

    it('passes the push token to SignOut, which removes it for the token owner', async () => {
      const { controller, refreshTokens, pushTokenRemover } = setup();
      const userId = randomUUID();
      refreshTokens.push(
        new RefreshToken({
          userId,
          tokenHash: 'f'.repeat(64),
          familyId: randomUUID(),
          expiresAt: new Date('2026-11-06T12:00:00.000Z'),
        }),
      );

      await controller.signOut({ refreshToken: 'refresh', pushToken: 'ExponentPushToken[abc]' });

      expect(pushTokenRemover.remove).toHaveBeenCalledWith(userId, 'ExponentPushToken[abc]');
    });

    it('answers refreshToken.token.required when there is no body', async () => {
      const { controller } = setup();

      await expect(controller.signOut(undefined)).rejects.toMatchObject({
        statusCode: 422,
        errors: [expect.objectContaining({ message: 'refreshToken.token.required' })],
      });
    });
  });
});
