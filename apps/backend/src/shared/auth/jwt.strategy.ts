import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UnauthorizedError } from '@rochas-surf-school/shared';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../db/prisma.service.js';
import { JwtPayload } from '../types/jwt-payload.type.js';
import { AuthenticatedUser } from '../types/current-user.type.js';
import { mapUserRecordToAuthenticatedUser } from './auth-user.mapper.js';

export const INVALID_TOKEN_ERROR = 'auth.token.invalid';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /** Reloads the account on every request, so a role or status change applies at once. */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const record = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    });
    if (!record) {
      throw new UnauthorizedError(INVALID_TOKEN_ERROR);
    }
    return mapUserRecordToAuthenticatedUser(record, payload);
  }
}
