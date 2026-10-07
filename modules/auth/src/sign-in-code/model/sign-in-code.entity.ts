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
