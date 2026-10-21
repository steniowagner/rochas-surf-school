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

/** The seat is not approved (any more) (409). */
const isNotApprovedError = (error: unknown): boolean => hasKey(error, 409, "enrolment.notApproved");

/** The cancellation deadline passed, or the class has none: the student contacts the school instead (409). */
export const isDeadlineClosedError = (error: unknown): boolean =>
  hasKey(error, 409, "enrolment.deadline.passed") || hasKey(error, 409, "enrolment.deadline.missing");

const isGuestNotFoundError = (error: unknown): boolean => hasKey(error, 404, "guest.notFound");

/** The school turned the waiting list off, and the class is full (409). */
export const isWaitingListClosedError = (error: unknown): boolean =>
  hasKey(error, 409, "enrolment.waitingList.closed");

const isClassStartedError = (error: unknown): boolean => hasKey(error, 409, "class.started");

const isClassCancelledError = (error: unknown): boolean => hasKey(error, 409, "class.cancelled");

/**
 * The failure means what is on screen is stale (the class started or was cancelled, the request is no longer pending
 * or is already open), so the class is read again.
 */
export const shouldReloadClass = (error: unknown): boolean =>
  isGuestNotFoundError(error) ||
  isClassStartedError(error) ||
  isClassCancelledError(error) ||
  isWaitingListClosedError(error) ||
  isAlreadyOpenError(error) ||
  isNotPendingError(error) ||
  isNotApprovedError(error) ||
  isDeadlineClosedError(error);

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

  if (isWaitingListClosedError(error)) {
    return "enrolment.errors.waitingListClosed";
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

/**
 * The translation key of the toast for a failed cancellation of a seat, or `null` when nothing should be shown: an
 * expired session is handled centrally, and a closed deadline is explained by the note the reload brings.
 */
export const getCancelSeatErrorKey = (error: unknown): string | null => {
  if (error instanceof SessionExpiredError || isDeadlineClosedError(error)) {
    return null;
  }

  if (isNotApprovedError(error)) {
    return "enrolment.errors.notApproved";
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

const isAlreadyApprovedError = (error: unknown): boolean => hasKey(error, 409, "enrolment.alreadyApproved");

const isInvalidStudentError = (error: unknown): boolean => hasKey(error, 422, "enrolment.student.invalid");

/**
 * Enrolling a student found what is on screen stale (the class filled, started or was cancelled, the student already
 * has a seat, or is no longer an approved student), so the classes are read again.
 */
export const shouldReloadEnrolClasses = (error: unknown): boolean =>
  isClassFullError(error) ||
  isClassStartedError(error) ||
  isClassCancelledError(error) ||
  isAlreadyApprovedError(error) ||
  isInvalidStudentError(error);

/** The translation key of the toast for a failed direct enrolment, or `null` when nothing should be shown. */
export const getEnrolStudentErrorKey = (error: unknown): string | null => {
  if (error instanceof SessionExpiredError) {
    return null;
  }

  if (isAlreadyApprovedError(error)) {
    return "enrolStudent.errors.alreadyApproved";
  }

  if (isClassFullError(error)) {
    return "enrolStudent.errors.full";
  }

  if (isClassStartedError(error)) {
    return "enrolStudent.errors.started";
  }

  if (isClassCancelledError(error)) {
    return "enrolStudent.errors.cancelled";
  }

  if (isInvalidStudentError(error)) {
    return "enrolStudent.errors.invalidStudent";
  }

  if (hasKey(error, 404, "class.notFound")) {
    return "classDetails.notFound";
  }

  return fallbackKey(error);
};

/** The translation key of the toast for a failed take-out, or `null` when nothing should be shown. */
export const getTakeOutErrorKey = (error: unknown): string | null => {
  if (error instanceof SessionExpiredError) {
    return null;
  }

  if (isNotApprovedError(error)) {
    return "takeOutSheet.errors.notApproved";
  }

  if (isClassStartedError(error)) {
    return "takeOutSheet.errors.started";
  }

  if (hasKey(error, 404, "enrolment.notFound")) {
    return "enrolment.errors.notFound";
  }

  return fallbackKey(error);
};

/** Adding a guest found what is on screen stale (the class filled, started or was cancelled), so the classes are read again. */
export const shouldReloadAddGuestClasses = (error: unknown): boolean =>
  isClassFullError(error) || isClassStartedError(error) || isClassCancelledError(error);

/** The guest's name or number was refused (422); the form already checks both, so this is the backend's second opinion. */
const isInvalidGuestError = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 422 && error.errors.some((key) => key.startsWith("guest."));

/** The translation key of the toast for a failed trial enrolment, or `null` when nothing should be shown. */
export const getAddGuestErrorKey = (error: unknown): string | null => {
  if (error instanceof SessionExpiredError) {
    return null;
  }

  if (isClassFullError(error)) {
    return "enrolStudent.errors.full";
  }

  if (isClassStartedError(error)) {
    return "enrolStudent.errors.started";
  }

  if (isClassCancelledError(error)) {
    return "enrolStudent.errors.cancelled";
  }

  if (isInvalidGuestError(error)) {
    return "enrolStudent.errors.invalidGuest";
  }

  if (hasKey(error, 404, "class.notFound")) {
    return "classDetails.notFound";
  }

  return fallbackKey(error);
};

/** The translation key of the toast for a failed removal of a guest, or `null` when nothing should be shown. */
export const getRemoveGuestErrorKey = (error: unknown): string | null => {
  if (error instanceof SessionExpiredError) {
    return null;
  }

  if (isClassStartedError(error)) {
    return "takeOutSheet.errors.started";
  }

  if (isGuestNotFoundError(error)) {
    return "takeOutSheet.errors.guestNotFound";
  }

  return fallbackKey(error);
};
