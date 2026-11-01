import { Injectable } from '@nestjs/common';
import {
  AppleIdTokenPayload,
  AppleIdTokenProvider,
} from '@rochas-surf-school/auth';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AuthConfig } from './auth.config.js';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';

@Injectable()
export class AppleAuthIdTokenProvider implements AppleIdTokenProvider {
  // Fetched at the first verification, then cached and refetched on an unknown key.
  private readonly keys = createRemoteJWKSet(new URL(APPLE_KEYS_URL));
  private readonly audience?: string;

  constructor(authConfig: AuthConfig) {
    this.audience = authConfig.appleClientId;
  }

  async verify(idToken: string): Promise<AppleIdTokenPayload> {
    if (!this.audience) {
      throw new Error('APPLE_CLIENT_ID is not configured');
    }

    const { payload } = await jwtVerify(idToken, this.keys, {
      issuer: APPLE_ISSUER,
      audience: this.audience,
      algorithms: ['RS256'],
    });
    if (!payload.sub) {
      throw new Error('Apple ID token has no sub');
    }

    return {
      sub: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      // The claim's type isn't reliable: Apple has sent it both as a boolean and as a string.
      emailVerified:
        payload.email_verified === true || payload.email_verified === 'true',
    };
  }
}
