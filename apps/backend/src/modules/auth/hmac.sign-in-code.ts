import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { SignInCodeProvider } from '@rochas-surf-school/auth';
import { AuthConfig } from './auth.config.js';

@Injectable()
export class HmacSignInCodeProvider implements SignInCodeProvider {
  private readonly pepper: string;

  constructor(authConfig: AuthConfig) {
    this.pepper = authConfig.codePepper;
  }

  generate(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  hash(email: string, code: string): string {
    return createHmac('sha256', this.pepper).update(`${email}:${code}`).digest('hex');
  }

  matches(hash: string, email: string, code: string): boolean {
    const expected = Buffer.from(this.hash(email, code), 'hex');
    const actual = Buffer.from(hash, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
