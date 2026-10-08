import { ApiError, NetworkError } from "@/services/api";

const keyByErrorCode: Record<string, string> = {
  "signInCode.email.invalid": "createAccount.errors.invalidEmail",
  "request.rate.limited": "createAccount.errors.tooManyAttempts",
  "signInCode.email.sendFailed": "createAccount.errors.sendFailed",
};

const GENERIC_ERROR_KEY = "createAccount.errors.generic";

/** The translation key of the friendly message for an error of `POST /auth/email/code`. */
export const getSignInCodeErrorKey = (error: unknown): string => {
  if (error instanceof NetworkError) {
    return "createAccount.errors.noConnection";
  }

  if (error instanceof ApiError) {
    return keyByErrorCode[error.errors[0]] ?? GENERIC_ERROR_KEY;
  }

  return GENERIC_ERROR_KEY;
};
