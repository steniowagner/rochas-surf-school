import { ApiError, NetworkError, SessionExpiredError } from "@/services/api";

const CONFLICT_KEYS: Record<string, string> = {
  "user.role.changeNotAllowed": "people.roleErrors.changed",
  "user.role.lastAdmin": "people.roleErrors.lastAdmin",
  "user.status.notApproved": "people.roleErrors.notApproved",
};

/**
 * The translation key of the toast for a failed role change, or `null` when nothing should be shown (an expired
 * session is handled once, centrally).
 */
export const getRoleChangeErrorKey = (error: unknown): string | null => {
  if (error instanceof SessionExpiredError) {
    return null;
  }

  if (error instanceof ApiError && error.status === 409) {
    const key = CONFLICT_KEYS[error.errors[0] ?? ""];
    if (key) return key;
  }

  if (error instanceof NetworkError) {
    return "createAccount.errors.noConnection";
  }

  return "createAccount.errors.generic";
};
