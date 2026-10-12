import { ApiError, NetworkError, SessionExpiredError } from "@/services/api";

const NOT_PENDING = "registration.status.notPending";

/** The registration was already decided (by another admin, or from a stale list). */
export const isAlreadyDecided = (error: unknown): boolean =>
  error instanceof ApiError &&
  error.status === 409 &&
  error.errors[0] === NOT_PENDING;

/**
 * The translation key of the toast for a failed decision, or `null` when nothing should be shown (an expired
 * session is handled once, centrally).
 */
export const getRegistrationErrorKey = (error: unknown): string | null => {
  if (error instanceof SessionExpiredError) {
    return null;
  }

  if (isAlreadyDecided(error)) {
    return "registrations.alreadyDecided";
  }

  if (error instanceof NetworkError) {
    return "createAccount.errors.noConnection";
  }

  return "createAccount.errors.generic";
};
