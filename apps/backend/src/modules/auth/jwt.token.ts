import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AccessTokenSubject,
  GeneratedRefreshToken,
  SignedAccessToken,
  TokenProvider,
} from '@rochas-surf-school/auth';

@Injectable()
export class JwtTokenProvider implements TokenProvider {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(subject: AccessTokenSubject): SignedAccessToken {
    const token = this.jwtService.sign(
      { sub: subject.id, email: subject.email },
      { algorithm: 'HS256' },
    );
    const { exp } = this.jwtService.decode<{ exp: number }>(token);
    return { token, expiresAt: new Date(exp * 1000) };
  }

  generateRefreshToken(): GeneratedRefreshToken {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: createHash('sha256').update(token).digest('hex') };
  }
}
