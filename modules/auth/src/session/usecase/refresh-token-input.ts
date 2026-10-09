import { RequiredRule, Validator } from "@rochas-surf-school/shared";

/** The plaintext refresh token of a request; anything but a non-empty string is `refreshToken.token.required`. */
export function requireRefreshToken(value: unknown): string {
  const token = typeof value === "string" ? value : "";
  Validator.validate([
    { code: "refreshToken.token", value: token, rules: [new RequiredRule()] },
  ]);
  return token;
}
