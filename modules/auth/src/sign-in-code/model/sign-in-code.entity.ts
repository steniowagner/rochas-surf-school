import {
  DateRule,
  EmailRule,
  Entity,
  EntityState,
  IntegerRule,
  MinValueRule,
  RegexRule,
  RequiredRule,
  Validator,
} from "@rochas-surf-school/shared";

export const SIGN_IN_CODE_HASH_PATTERN = /^[0-9a-f]{64}$/;
/** A code is valid for 10 minutes after it is sent. */
export const SIGN_IN_CODE_TTL_MS = 10 * 60 * 1000;
/** A new code can be requested 30 seconds after the last one was sent. */
export const SIGN_IN_CODE_RESEND_COOLDOWN_MS = 30 * 1000;
/** Wrong guesses after which the code is locked. */
export const SIGN_IN_CODE_MAX_ATTEMPTS = 5;

/** Trimmed and lowercased, as every email is stored; non-strings become "". */
export function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isValidEmail(email: string): boolean {
  return email !== "" && new EmailRule().validate(email) === null;
}

export interface SignInCodeState extends EntityState {
  email: string;
  codeHash: string;
  expiresAt: Date;
  lastSentAt: Date;
  attempts: number;
}

export class SignInCode extends Entity<SignInCodeState> {
  constructor(props: SignInCodeState) {
    super(props);
  }

  get email(): string {
    return this.props.email;
  }

  get codeHash(): string {
    return this.props.codeHash;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get lastSentAt(): Date {
    return this.props.lastSentAt;
  }

  get attempts(): number {
    return this.props.attempts;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "signInCode.email",
        value: this.email,
        rules: [new RequiredRule(), new EmailRule()],
      },
      {
        code: "signInCode.codeHash",
        value: this.codeHash,
        rules: [new RequiredRule(), new RegexRule(SIGN_IN_CODE_HASH_PATTERN)],
      },
      {
        code: "signInCode.expiresAt",
        value: this.expiresAt,
        rules: [new RequiredRule(), new DateRule()],
      },
      {
        code: "signInCode.lastSentAt",
        value: this.lastSentAt,
        rules: [new RequiredRule(), new DateRule()],
      },
      {
        code: "signInCode.attempts",
        value: this.attempts,
        rules: [new RequiredRule(), new IntegerRule(), new MinValueRule(0)],
      },
    ]);
  }
}
