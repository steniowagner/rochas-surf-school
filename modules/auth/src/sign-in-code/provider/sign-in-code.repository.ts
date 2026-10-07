import { SignInCode } from "../model";

export interface SignInCodeRepository {
  findByEmail(email: string): Promise<SignInCode | null>;
  /** Creates or replaces the code of `signInCode.email`. */
  save(signInCode: SignInCode): Promise<SignInCode>;
  deleteByEmail(email: string): Promise<void>;
  /** Adds one wrong attempt atomically. */
  incrementAttempts(email: string): Promise<void>;
  /** Deletes the code atomically when it matches; `true` only for the caller that deleted it. */
  consume(email: string, codeHash: string): Promise<boolean>;
  /** Deletes every code whose `expiresAt` is before `now`; returns how many were deleted. */
  deleteExpired(now: Date): Promise<number>;
}
