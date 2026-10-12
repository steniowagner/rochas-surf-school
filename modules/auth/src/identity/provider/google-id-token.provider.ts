export interface GoogleIdTokenPayload {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

export interface GoogleIdTokenProvider {
  /** Rejects for any invalid token (signature, expiry, issuer, audience, malformed). */
  verify(idToken: string): Promise<GoogleIdTokenPayload>;
}
