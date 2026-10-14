import { ApiError, NetworkError, SessionExpiredError } from "@/services/api";

const hasKey = (error: unknown, status: number, key: string): boolean =>
  error instanceof ApiError &&
  error.status === status &&
  error.errors[0] === key;

/** A location with that name already exists (409). */
export const isDuplicateLocationError = (error: unknown): boolean =>
  hasKey(error, 409, "location.name.duplicate");

/** The chosen location is gone (422), so the list is stale. */
export const isLocationNotFoundError = (error: unknown): boolean =>
  hasKey(error, 422, "class.location.notFound");

/** An assigned instructor can no longer teach (422), so the list is stale. */
export const isInstructorsInvalidError = (error: unknown): boolean =>
  hasKey(error, 422, "class.instructors.invalid");

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

  if (isDuplicateLocationError(error)) {
    return "locationSheet.duplicate";
  }

  if (error instanceof NetworkError) {
    return "createAccount.errors.noConnection";
  }

  return "createAccount.errors.generic";
};
