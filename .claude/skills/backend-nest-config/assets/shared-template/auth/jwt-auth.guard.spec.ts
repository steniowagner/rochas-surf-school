import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { UnauthorizedError } from '__SCOPE__/shared';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

function context(): ExecutionContext {
  return {
    getHandler: () => 'handler',
    getClass: () => 'class',
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lets public routes through without checking the token', () => {
    const reflector = new Reflector();
    const getAllAndOverride = vi
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(true);

    expect(new JwtAuthGuard(reflector).canActivate(context())).toBe(true);
    expect(getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      'handler',
      'class',
    ]);
  });

  it('checks the JWT on every other route', () => {
    const reflector = new Reflector();
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const parent = vi
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(false);

    expect(new JwtAuthGuard(reflector).canActivate(context())).toBe(false);
    expect(parent).toHaveBeenCalled();
  });

  describe('handleRequest', () => {
    const guard = () => new JwtAuthGuard(new Reflector());

    it('returns the authenticated user', () => {
      const user = { id: 'user-1' };

      expect(guard().handleRequest(null, user)).toBe(user);
    });

    it.each([
      ['no user (missing, malformed, wrong signature or expired token)', null, false],
      ['a strategy error (unknown account)', new Error('boom'), { id: 'user-1' }],
    ])('answers 401 auth.token.invalid for %s', (_name, err, user) => {
      let thrown: unknown;
      try {
        guard().handleRequest(err, user);
      } catch (e) {
        thrown = e;
      }

      expect(thrown).toBeInstanceOf(UnauthorizedError);
      expect(thrown).toMatchObject({ message: 'auth.token.invalid', statusCode: 401 });
    });
  });
});
