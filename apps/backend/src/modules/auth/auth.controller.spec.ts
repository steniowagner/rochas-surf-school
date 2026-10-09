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
import { HmacSignInCodeProvider } from './hmac.sign-in-code.js';
import { PrismaIdentityRepository } from './identity.prisma.js';
import { JwtTokenProvider } from './jwt.token.js';
import { PrismaRefreshTokenRepository } from './refresh-token.prisma.js';
import { ResendEmailProvider } from './resend.email.js';
import { PrismaSignInCodeRepository } from './sign-in-code.prisma.js';
import { SystemClockProvider } from './system.clock.js';
import { PrismaUserRepository } from './user.prisma.js';

const NOW = new Date('2026-10-07T12:00:00.000Z');

function handlerOf(name: keyof AuthController): object {
  return Object.getOwnPropertyDescriptor(AuthController.prototype, name)!.value as object;
}

function setup(reviewCodes: Record<string, string> = {}, users: User[] = []) {
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
  };
  const identities: Identity[] = [];
  const identityRepository = {
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
  };
  const tokenProvider = {
    signAccessToken: vi.fn(() => ({ token: 'access', expiresAt: new Date('2026-10-07T12:15:00.000Z') })),
    generateRefreshToken: vi.fn(() => ({ token: 'refresh', hash: 'f'.repeat(64) })),
  };
  const emailProvider = { sendSignInCode: vi.fn().mockResolvedValue(undefined) };
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
  );
  return { controller, codes, emailProvider, identities, refreshTokens };
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
        },
      });
      expect(refreshTokens).toHaveLength(1);
      expect(identities).toHaveLength(1);
    });

    it('passes the name for a new account', async () => {
      const { controller, emailProvider } = setup();
      await controller.requestSignInCode({ email: 'bia@example.com' });
      const code = (emailProvider.sendSignInCode.mock.calls[0]![0] as { code: string }).code;

      const result = await controller.verifySignInCode({
        email: 'bia@example.com',
        code,
        name: 'Bia Souza',
      });

      expect(result.user).toMatchObject({ name: 'Bia Souza', status: 'pending', role: 'student' });
    });

    it('answers signInCode.code.invalid when there is no body', async () => {
      const { controller } = setup();

      await expect(controller.verifySignInCode(undefined)).rejects.toMatchObject({
        statusCode: 401,
        message: 'signInCode.code.invalid',
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
      });
    });

    it('answers auth.token.invalid when the account is gone', async () => {
      const { controller } = setup();

      await expect(controller.me(ana.id)).rejects.toMatchObject({
        statusCode: 401,
        message: 'auth.token.invalid',
      });
    });
  });
});
