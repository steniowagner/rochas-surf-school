import { ApiError, NetworkError } from "@/services/api";
import { isErrorWithCode, statusCodes } from "@/services/google-sign-in";

const IGNORED_CODES: string[] = [
  statusCodes.SIGN_IN_CANCELLED,
  statusCodes.IN_PROGRESS,
];

const keyByApiErrorCode: Record<string, string> = {
  "auth.google.tokenInvalid": "googleSignIn.tokenInvalid",
  "auth.google.emailNotVerified": "googleSignIn.emailNotVerified",
};

/**
 * The translation key of the toast for a failed Google sign-in, or `null` when nothing should be shown (the person
 * closed the account picker, or a sign-in is already running).
 */
export const getGoogleSignInError = (error: unknown): string | null => {
  if (error instanceof NetworkError) {
    return "createAccount.errors.noConnection";
  }

  if (error instanceof ApiError) {
    return (
      keyByApiErrorCode[error.errors[0] ?? ""] ?? "createAccount.errors.generic"
    );
  }

  if (isErrorWithCode(error)) {
    if (IGNORED_CODES.includes(error.code)) {
      return null;
    }

    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return "googleSignIn.playServices";
    }
  }

  return "createAccount.errors.generic";
};
