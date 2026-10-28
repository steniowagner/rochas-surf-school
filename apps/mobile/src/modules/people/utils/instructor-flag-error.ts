import { ApiError, NetworkError, SessionExpiredError } from "@/services/api";

const CONFLICT_KEYS: Record<string, string> = {
  "user.role.changeNotAllowed": "people.roleErrors.changed",
  "people.isInstructor.notAdmin": "people.roleErrors.changed",
  "user.status.notApproved": "people.roleErrors.notApproved",
};

/**
 * The translation key of the toast for a failed instructor-flag change, or `null` when nothing should be shown (an
 * expired session is handled once, centrally).
 */
export const getInstructorFlagErrorKey = (error: unknown): string | null => {
  if (error instanceof SessionExpiredError) {
    return null;
  }

  if (error instanceof ApiError && error.status === 404) {
    return "people.roleErrors.notApproved";
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
