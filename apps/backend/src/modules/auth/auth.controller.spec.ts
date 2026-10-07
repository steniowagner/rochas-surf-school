import { HttpStatus, RequestMethod } from '@nestjs/common';
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { SignInCode } from '@rochas-surf-school/auth';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator.js';
import { AuthConfig } from './auth.config.js';
import { AuthController } from './auth.controller.js';
import { HmacSignInCodeProvider } from './hmac.sign-in-code.js';
import { ResendEmailProvider } from './resend.email.js';
import { PrismaSignInCodeRepository } from './sign-in-code.prisma.js';
import { SystemClockProvider } from './system.clock.js';

const NOW = new Date('2026-10-07T12:00:00.000Z');

function handlerOf(name: keyof AuthController): object {
  return Object.getOwnPropertyDescriptor(AuthController.prototype, name)!.value as object;
}

function setup(reviewCodes: Record<string, string> = {}) {
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
  };
  const emailProvider = { sendSignInCode: vi.fn().mockResolvedValue(undefined) };
  const controller = new AuthController(
    { reviewCodes } as AuthConfig,
    signInCodeRepository as unknown as PrismaSignInCodeRepository,
    new HmacSignInCodeProvider({ codePepper: 'pepper' } as AuthConfig),
    emailProvider as unknown as ResendEmailProvider,
    { now: () => NOW } as SystemClockProvider,
  );
  return { controller, codes, emailProvider };
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
});
