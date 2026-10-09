import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { UnauthorizedError } from '@rochas-surf-school/shared';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { INVALID_TOKEN_ERROR } from './jwt.strategy.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  /** Every refusal (no token, bad token, expired, unknown user) answers the same 401 key. */
  handleRequest<TUser>(err: unknown, user: TUser | false | null | undefined): TUser {
    if (err || !user) {
      throw new UnauthorizedError(INVALID_TOKEN_ERROR);
    }
    return user;
  }
}
