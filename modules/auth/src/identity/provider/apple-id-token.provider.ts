export interface AppleIdTokenPayload {
  sub: string;
  /** Apple may leave it out, and a known identity needs none. */
  email?: string;
  emailVerified: boolean;
}

export interface AppleIdTokenProvider {
  /** Rejects for any invalid token (signature, expiry, issuer, audience, algorithm, malformed, no `sub`). */
  verify(idToken: string): Promise<AppleIdTokenPayload>;
}
