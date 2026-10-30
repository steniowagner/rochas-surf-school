import { Injectable } from '@nestjs/common';
import { GoogleIdTokenPayload, GoogleIdTokenProvider } from '@rochas-surf-school/auth';
import { OAuth2Client } from 'google-auth-library';
import { AuthConfig } from './auth.config.js';

// Google's URL ends in the size it serves, 96 px, which is blurry on the 112 pt profile avatar at 3x.
const GOOGLE_PICTURE_SIZE = /=s\d+-c$/;
const PICTURE_SIZE = '=s400-c';

@Injectable()
export class GoogleAuthIdTokenProvider implements GoogleIdTokenProvider {
  private readonly client = new OAuth2Client();
  private readonly audience?: string;

  constructor(authConfig: AuthConfig) {
    this.audience = authConfig.googleWebClientId;
  }

  async verify(idToken: string): Promise<GoogleIdTokenPayload> {
    if (!this.audience) {
      throw new Error('GOOGLE_WEB_CLIENT_ID is not configured');
    }

    const ticket = await this.client.verifyIdToken({ idToken, audience: this.audience });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new Error('Google ID token has no sub or email');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      name: payload.name,
      picture: payload.picture?.replace(GOOGLE_PICTURE_SIZE, PICTURE_SIZE),
    };
  }
}
