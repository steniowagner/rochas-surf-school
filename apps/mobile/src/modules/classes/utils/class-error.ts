import { ApiError, NetworkError, SessionExpiredError } from "@/services/api";

const hasKey = (error: unknown, status: number, key: string): boolean =>
  error instanceof ApiError &&
  error.status === status &&
  error.errors[0] === key;

/** A location with that name already exists (409). */
export const isDuplicateLocationError = (error: unknown): boolean =>
  hasKey(error, 409, "location.name.duplicate");

/** The location was removed meanwhile (409), so it can't be edited or removed again. */
export const isLocationArchivedError = (error: unknown): boolean =>
  hasKey(error, 409, "location.archived");

/** The location to edit or remove is gone, removed or unknown (409 or 404), so the list is stale. */
export const isLocationGoneError = (error: unknown): boolean =>
  isLocationArchivedError(error) || hasKey(error, 404, "location.notFound");

/** A class can't be given a removed location (422), so the list is stale and the selection must go. */
export const isClassLocationArchivedError = (error: unknown): boolean =>
  hasKey(error, 422, "class.location.archived");

/** The chosen location is gone (422), so the list is stale. */
export const isLocationNotFoundError = (error: unknown): boolean =>
  hasKey(error, 422, "class.location.notFound");

/** An assigned instructor can no longer teach (422), so the list is stale. */
export const isInstructorsInvalidError = (error: unknown): boolean =>
  hasKey(error, 422, "class.instructors.invalid");

/** The class has started, so only its instructors can change (409). */
export const isClassStartedError = (error: unknown): boolean =>
  hasKey(error, 409, "class.started");

/** The class has finished and can't change (409). */
export const isClassFinishedError = (error: unknown): boolean =>
  hasKey(error, 409, "class.finished");

/** The class was already cancelled (409). */
export const isClassCancelledError = (error: unknown): boolean =>
  hasKey(error, 409, "class.cancelled");

/** The class has seats or pending requests, so it can only be cancelled (409). */
export const isClassNotEmptyError = (error: unknown): boolean =>
  hasKey(error, 409, "class.delete.notEmpty");

/** The class is gone (404). */
export const isClassNotFoundError = (error: unknown): boolean =>
  hasKey(error, 404, "class.notFound");

/** The seats taken that a too-small capacity ran into (422), or `null` for any other error. */
export const getSeatsTaken = (error: unknown): number | null => {
  if (!hasKey(error, 422, "class.capacity.belowSeatsTaken")) {
    return null;
  }

  const seatsTaken = (error as ApiError).details?.seatsTaken;
  return typeof seatsTaken === "number" ? seatsTaken : null;
};

/**
 * The translation key of the toast for a failed request of the Nova aula screen, or `null` when nothing should be
 * shown (an expired session is handled once, centrally).
 */
export const getClassErrorKey = (error: unknown): string | null => {
  if (error instanceof SessionExpiredError) {
    return null;
  }

  if (hasKey(error, 422, "class.startsAt.past")) {
    return "newClass.errors.past";
  }

  if (isInstructorsInvalidError(error)) {
    return "newClass.errors.instructors";
  }

  if (isLocationNotFoundError(error)) {
    return "newClass.errors.location";
  }

  if (isClassLocationArchivedError(error)) {
    return "newClass.errors.locationArchived";
  }

  if (isDuplicateLocationError(error)) {
    return "locationSheet.duplicate";
  }

  if (error instanceof NetworkError) {
    return "createAccount.errors.noConnection";
  }

  return "createAccount.errors.generic";
};

/**
 * The translation key of the toast for a failed edit or removal of a location, or `null` when nothing should be
 * shown. A repeated name (409) shows inline instead (see `isDuplicateLocationError`), but the generic mapping still
 * answers it.
 */
export const getLocationErrorKey = (error: unknown): string | null => {
  if (isLocationGoneError(error)) {
    return "locationSheet.errors.gone";
  }

  return getClassErrorKey(error);
};

/**
 * The translation key of the toast for a failed save of the Editar aula screen, or `null` when nothing should be
 * shown. `editClass.errors.seatsTaken` takes the seats taken as `count` (see `getSeatsTaken`).
 */
export const getEditClassErrorKey = (error: unknown): string | null => {
  if (isClassStartedError(error)) {
    return "editClass.errors.started";
  }

  if (isClassFinishedError(error)) {
    return "editClass.errors.finished";
  }

  if (isClassCancelledError(error)) {
    return "editClass.errors.cancelled";
  }

  if (isClassNotFoundError(error)) {
    return "classDetails.notFound";
  }

  if (getSeatsTaken(error) !== null) {
    return "editClass.errors.seatsTaken";
  }

  return getClassErrorKey(error);
};

/**
 * The translation key of the toast for a failed cancellation, or `null` when nothing should be shown. A message over
 * the limit can't be typed, so it falls to the generic copy.
 */
export const getCancelClassErrorKey = (error: unknown): string | null => {
  if (error instanceof SessionExpiredError) {
    return null;
  }

  if (isClassCancelledError(error)) {
    return "cancelClass.errors.cancelled";
  }

  if (isClassFinishedError(error)) {
    return "cancelClass.errors.finished";
  }

  if (isClassNotFoundError(error)) {
    return "classDetails.notFound";
  }

  if (error instanceof NetworkError) {
    return "createAccount.errors.noConnection";
  }

  return "createAccount.errors.generic";
};

/**
 * The translation key of the toast for a failed deletion, or `null` when nothing should be shown. A class that is
 * not empty has no toast (the sheet switches to its "can't delete" variant: see `isClassNotEmptyError`).
 */
export const getDeleteClassErrorKey = (error: unknown): string | null => {
  if (error instanceof SessionExpiredError || isClassNotEmptyError(error)) {
    return null;
  }

  if (isClassStartedError(error)) {
    return "deleteClass.errors.started";
  }

  if (isClassCancelledError(error)) {
    return "deleteClass.errors.cancelled";
  }

  if (isClassNotFoundError(error)) {
    return "classDetails.notFound";
  }

  if (error instanceof NetworkError) {
    return "createAccount.errors.noConnection";
  }

  return "createAccount.errors.generic";
};
