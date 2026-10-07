export const SIGN_IN_LOCALES = ["pt-BR", "es", "en"] as const;
export type SignInLocale = (typeof SIGN_IN_LOCALES)[number];

export interface SendSignInCodeIn {
  to: string;
  code: string;
  locale: SignInLocale;
  idempotencyKey: string;
}

export interface EmailProvider {
  /** Sends the sign-in code email; rejects when the email could not be sent. */
  sendSignInCode(input: SendSignInCodeIn): Promise<void>;
}
