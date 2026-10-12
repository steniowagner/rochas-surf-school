import { GoogleIdTokenPayload, GoogleIdTokenProvider } from "../../src";

export class FakeGoogleIdTokenProvider implements GoogleIdTokenProvider {
  readonly verified: string[] = [];

  constructor(private readonly payloads: Record<string, GoogleIdTokenPayload> = {}) {}

  async verify(idToken: string): Promise<GoogleIdTokenPayload> {
    this.verified.push(idToken);
    const payload = this.payloads[idToken];
    if (!payload) {
      throw new Error("invalid token");
    }
    return payload;
  }
}
