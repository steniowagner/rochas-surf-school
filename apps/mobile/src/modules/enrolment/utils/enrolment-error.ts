import { ApiError, NetworkError, SessionExpiredError } from "@/services/api";

const hasKey = (error: unknown, status: number, key: string): boolean =>
  error instanceof ApiError &&
  error.status === status &&
  error.errors[0] === key;

/** The rule of the discipline must be accepted and wasn't (422), so the rules on screen are stale. */
export const isRuleNotAcceptedError = (error: unknown): boolean =>
  hasKey(error, 422, "enrolment.rule.notAccepted");

/** The student already has a pending or approved enrolment in the class (409). */
export const isAlreadyOpenError = (error: unknown): boolean =>
  hasKey(error, 409, "enrolment.alreadyOpen");

/** The enrolment is no longer pending (409). */
export const isNotPendingError = (error: unknown): boolean =>
  hasKey(error, 409, "enrolment.notPending");

const isClassStartedError = (error: unknown): boolean => hasKey(error, 409, "class.started");

const isClassCancelledError = (error: unknown): boolean => hasKey(error, 409, "class.cancelled");

/**
 * The failure means what is on screen is stale (the class started or was cancelled, the request is no longer pending
 * or is already open), so the class is read again.
 */
export const shouldReloadClass = (error: unknown): boolean =>
  isClassStartedError(error) ||
  isClassCancelledError(error) ||
  isAlreadyOpenError(error) ||
  isNotPendingError(error);

const fallbackKey = (error: unknown): string =>
  error instanceof NetworkError ? "createAccount.errors.noConnection" : "createAccount.errors.generic";

/**
 * The translation key of the toast for a failed request of a seat, or `null` when nothing should be shown (an expired
 * session is handled once, centrally).
 */
export const getRequestSeatErrorKey = (error: unknown): string | null => {
  if (error instanceof SessionExpiredError) {
    return null;
  }

  if (isClassStartedError(error)) {
    return "enrolment.errors.started";
  }

  if (isClassCancelledError(error)) {
    return "enrolment.errors.cancelled";
  }

  if (isAlreadyOpenError(error)) {
    return "enrolment.errors.alreadyOpen";
  }

  if (isRuleNotAcceptedError(error)) {
    return "enrolment.errors.ruleNotAccepted";
  }

  if (hasKey(error, 404, "class.notFound")) {
    return "classDetails.notFound";
  }

  return fallbackKey(error);
};

/** The translation key of the toast for a failed withdrawal, or `null` when nothing should be shown. */
export const getWithdrawRequestErrorKey = (error: unknown): string | null => {
  if (error instanceof SessionExpiredError) {
    return null;
  }

  if (isNotPendingError(error)) {
    return "enrolment.errors.notPending";
  }

  if (isClassStartedError(error)) {
    return "enrolment.errors.started";
  }

  if (hasKey(error, 404, "enrolment.notFound")) {
    return "enrolment.errors.notFound";
  }

  return fallbackKey(error);
};

const isClassFullError = (error: unknown): boolean => hasKey(error, 409, "enrolment.class.full");

/**
 * An admin's decision found the list stale (decided meanwhile, the class started, or the last seat gone), so the
 * list is read again.
 */
export const shouldReloadRequests = (error: unknown): boolean =>
  isNotPendingError(error) || isClassStartedError(error) || isClassFullError(error);

/** The translation key of the toast for a failed approval or denial, or `null` when nothing should be shown. */
export const getDecideRequestErrorKey = (error: unknown): string | null => {
  if (error instanceof SessionExpiredError) {
    return null;
  }

  if (isNotPendingError(error)) {
    return "classRequests.errors.notPending";
  }

  if (isClassStartedError(error)) {
    return "classRequests.errors.started";
  }

  if (isClassFullError(error)) {
    return "classRequests.errors.full";
  }

  if (hasKey(error, 404, "enrolment.notFound")) {
    return "enrolment.errors.notFound";
  }

  return fallbackKey(error);
};
