import { createHash } from "node:crypto";
import { SignInCodeProvider } from "../../src";

/** Returns the queued codes in order, then "000000"; hashes with a plain SHA-256. */
export class FakeSignInCodeProvider implements SignInCodeProvider {
  private readonly queue: string[];

  constructor(codes: string[] = []) {
    this.queue = [...codes];
  }

  enqueue(...codes: string[]): void {
    this.queue.push(...codes);
  }

  generate(): string {
    return this.queue.shift() ?? "000000";
  }

  hash(email: string, code: string): string {
    return createHash("sha256").update(`${email}:${code}`).digest("hex");
  }

  matches(hash: string, email: string, code: string): boolean {
    return this.hash(email, code) === hash;
  }
}
