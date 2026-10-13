import {
  Entity,
  EntityState,
  RequiredRule,
  UuidRule,
  Validator,
} from "@rochas-surf-school/shared";
import type { ValidationRule } from "@rochas-surf-school/shared";

export const PUSH_TOKEN_PATTERN = /^Expo(nent)?PushToken\[[^\]]+\]$/;

export const PUSH_LOCALES = ["pt-BR", "es", "en"] as const;

export type PushLocale = (typeof PUSH_LOCALES)[number];

export interface PushTokenState extends EntityState {
  token: string;
  userId: string;
  locale: PushLocale;
}

function invalidUnless(isValid: (value: unknown) => boolean): ValidationRule {
  return { validate: (value) => (isValid(value) ? null : "invalid") };
}

/** One device of one person: the Expo push token, and the language its pushes are written in. */
export class PushToken extends Entity<PushTokenState> {
  constructor(props: PushTokenState) {
    super(props);
  }

  get token(): string {
    return this.props.token;
  }

  get userId(): string {
    return this.props.userId;
  }

  get locale(): PushLocale {
    return this.props.locale;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "pushToken.token",
        value: this.token,
        rules: [
          invalidUnless(
            (value) => typeof value === "string" && PUSH_TOKEN_PATTERN.test(value),
          ),
        ],
      },
      {
        code: "pushToken.locale",
        value: this.locale,
        rules: [
          invalidUnless((value) =>
            (PUSH_LOCALES as readonly unknown[]).includes(value),
          ),
        ],
      },
      {
        code: "pushToken.userId",
        value: this.userId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);
  }
}
