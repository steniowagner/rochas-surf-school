export interface AccessTokenSubject {
  id: string;
  email: string;
}

export interface SignedAccessToken {
  token: string;
  expiresAt: Date;
}

export interface GeneratedRefreshToken {
  /** The plaintext token, returned to the client only. */
  token: string;
  /** The hash stored instead of the token. */
  hash: string;
}

export interface TokenProvider {
  signAccessToken(subject: AccessTokenSubject): SignedAccessToken;
  generateRefreshToken(): GeneratedRefreshToken;
  /** The hash stored for a plaintext refresh token (same as `generateRefreshToken().hash`). */
  hashRefreshToken(token: string): string;
}
