import { ApiError, NetworkError, SessionExpiredError } from "@/services/api";

const hasKey = (error: unknown, status: number, key: string): boolean =>
  error instanceof ApiError &&
  error.status === status &&
  error.errors[0] === key;

/** The rule being edited or deleted no longer exists (404), so the list on screen is stale. */
export const isRuleNotFoundError = (error: unknown): boolean =>
  hasKey(error, 404, "schoolRule.id.notFound");

const fallbackKey = (error: unknown): string =>
  error instanceof NetworkError ? "createAccount.errors.noConnection" : "createAccount.errors.generic";

/**
 * The translation key of the toast for a failed add, edit or delete of a rule, or `null` when nothing should be shown
 * (an expired session is handled once, centrally).
 */
export const getSchoolRuleErrorKey = (error: unknown): string | null => {
  if (error instanceof SessionExpiredError) {
    return null;
  }

  if (isRuleNotFoundError(error)) {
    return "manageSchoolRules.toasts.notFound";
  }

  return fallbackKey(error);
};
