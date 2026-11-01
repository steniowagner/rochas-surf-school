import { ApiError, NetworkError } from "@/services/api";
import { APPLE_SIGN_IN_CANCELED } from "@/services/apple-sign-in";

const keyByApiErrorCode: Record<string, string> = {
  "auth.apple.tokenInvalid": "appleSignIn.tokenInvalid",
  "auth.apple.emailNotVerified": "appleSignIn.emailNotVerified",
  "auth.apple.emailMissing": "appleSignIn.emailMissing",
};

/** The translation key of the toast for a failed `POST /auth/apple` (or an unreachable API). */
export const getAppleApiErrorKey = (error: unknown): string => {
  if (error instanceof NetworkError) {
    return "createAccount.errors.noConnection";
  }

  if (error instanceof ApiError) {
    return (
      keyByApiErrorCode[error.errors[0] ?? ""] ?? "createAccount.errors.generic"
    );
  }

  return "createAccount.errors.generic";
};

const isCanceled = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === APPLE_SIGN_IN_CANCELED;

/** The translation key of the toast for a failed Apple sign-in, or `null` when the person closed Apple's sheet. */
export const getAppleSignInError = (error: unknown): string | null =>
  isCanceled(error) ? null : getAppleApiErrorKey(error);
