import { AppleIdTokenPayload, AppleIdTokenProvider } from "../../src";

export class FakeAppleIdTokenProvider implements AppleIdTokenProvider {
  readonly verified: string[] = [];

  constructor(private readonly payloads: Record<string, AppleIdTokenPayload> = {}) {}

  async verify(idToken: string): Promise<AppleIdTokenPayload> {
    this.verified.push(idToken);
    const payload = this.payloads[idToken];
    if (!payload) {
      throw new Error("invalid token");
    }
    return payload;
  }
}
