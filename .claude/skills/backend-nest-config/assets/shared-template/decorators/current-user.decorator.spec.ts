import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import { AuthenticatedUser } from '../types/current-user.type.js';
import { CurrentUser } from './current-user.decorator.js';
import { IS_PUBLIC_KEY, Public } from './public.decorator.js';

type Factory = (data: unknown, ctx: ExecutionContext) => unknown;

function factoryOf(decorator: ParameterDecorator): Factory {
  class Target {
    handler(_user: unknown) {}
  }
  decorator(Target.prototype, 'handler', 0);
  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Target, 'handler') as Record<
    string,
    { factory: Factory }
  >;
  return Object.values(metadata)[0]!.factory;
}

function context(user?: AuthenticatedUser): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('CurrentUser', () => {
  const user: AuthenticatedUser = {
    id: 'user-1',
    email: 'ana@example.com',
    claims: { sub: 'user-1' },
  };
  const factory = factoryOf(CurrentUser());

  it('returns the authenticated user', () => {
    expect(factory(undefined, context(user))).toBe(user);
  });

  it('returns one field when asked', () => {
    expect(factory('id', context(user))).toBe('user-1');
  });

  it('returns undefined when nobody is signed in', () => {
    expect(factory(undefined, context())).toBeUndefined();
  });
});

describe('Public', () => {
  it('marks a route as public', () => {
    const handler = () => undefined;
    Public()({}, 'handler', { value: handler } as PropertyDescriptor);

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
  });
});
