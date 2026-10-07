import {
  DateRule,
  Entity,
  EntityState,
  RegexRule,
  RequiredRule,
  UuidRule,
  Validator,
} from "@rochas-surf-school/shared";

export const REFRESH_TOKEN_HASH_PATTERN = /^[0-9a-f]{64}$/;

export interface RefreshTokenState extends EntityState {
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt?: Date;
}

export class RefreshToken extends Entity<RefreshTokenState> {
  constructor(props: RefreshTokenState) {
    super(props);
  }

  get userId(): string {
    return this.props.userId;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get familyId(): string {
    return this.props.familyId;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get revokedAt(): Date | undefined {
    return this.props.revokedAt;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "refreshToken.userId",
        value: this.userId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "refreshToken.tokenHash",
        value: this.tokenHash,
        rules: [new RequiredRule(), new RegexRule(REFRESH_TOKEN_HASH_PATTERN)],
      },
      {
        code: "refreshToken.familyId",
        value: this.familyId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "refreshToken.expiresAt",
        value: this.expiresAt,
        rules: [new RequiredRule(), new DateRule()],
      },
      {
        code: "refreshToken.revokedAt",
        value: this.revokedAt,
        rules: [new DateRule()],
      },
    ]);
  }
}
