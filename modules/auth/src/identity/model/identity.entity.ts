import {
  EmailRule,
  Entity,
  EntityState,
  InRule,
  MaxLengthRule,
  RequiredRule,
  UuidRule,
  Validator,
} from "@rochas-surf-school/shared";

export const IDENTITY_PROVIDERS = [
  "google",
  "apple",
  "email",
] as const;
export type IdentityProvider = (typeof IDENTITY_PROVIDERS)[number];

export interface IdentityState extends EntityState {
  userId: string;
  provider: IdentityProvider;
  providerUserId: string;
  email?: string;
}

export class Identity extends Entity<IdentityState> {
  constructor(props: IdentityState) {
    super(props);
  }

  get userId(): string {
    return this.props.userId;
  }

  get provider(): IdentityProvider {
    return this.props.provider;
  }

  get providerUserId(): string {
    return this.props.providerUserId;
  }

  get email(): string | undefined {
    return this.props.email;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "identity.userId",
        value: this.userId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "identity.provider",
        value: this.provider,
        rules: [new RequiredRule(), new InRule(IDENTITY_PROVIDERS)],
      },
      {
        code: "identity.providerUserId",
        value: this.providerUserId,
        rules: [new RequiredRule(), new MaxLengthRule(255)],
      },
      {
        code: "identity.email",
        value: this.email,
        rules: [new EmailRule()],
      },
    ]);
  }
}
