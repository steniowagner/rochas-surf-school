import { SignInCode, SignInCodeRepository } from "../../src";

export class FakeSignInCodeRepository implements SignInCodeRepository {
  private readonly storage = new Map<string, SignInCode>();

  constructor(initialCodes: SignInCode[] = []) {
    for (const code of initialCodes) {
      this.storage.set(code.email, code);
    }
  }

  get codes(): SignInCode[] {
    return Array.from(this.storage.values());
  }

  async findByEmail(email: string): Promise<SignInCode | null> {
    return this.storage.get(email) ?? null;
  }

  async save(signInCode: SignInCode): Promise<SignInCode> {
    this.storage.set(signInCode.email, signInCode);
    return signInCode;
  }

  async deleteByEmail(email: string): Promise<void> {
    this.storage.delete(email);
  }

  async incrementAttempts(email: string): Promise<void> {
    const current = this.storage.get(email);
    if (current) {
      this.storage.set(email, current.clone({ attempts: current.attempts + 1 }));
    }
  }

  async consume(email: string, codeHash: string): Promise<boolean> {
    const current = this.storage.get(email);
    if (!current || current.codeHash !== codeHash) return false;

    this.storage.delete(email);
    return true;
  }

  async deleteExpired(now: Date): Promise<number> {
    let deleted = 0;
    for (const [email, code] of this.storage) {
      if (code.expiresAt.getTime() < now.getTime()) {
        this.storage.delete(email);
        deleted++;
      }
    }
    return deleted;
  }
}
