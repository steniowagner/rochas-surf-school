import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
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
});
