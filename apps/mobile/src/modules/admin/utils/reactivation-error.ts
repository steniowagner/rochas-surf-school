import { ApiError } from "@/services/api";

import { getRegistrationErrorKey } from "./registration-error";

const NOT_REQUESTED = "reactivation.status.notRequested";

/** The request was already decided (by another admin, or from a stale list). */
export const isReactivationAlreadyDecided = (error: unknown): boolean =>
  error instanceof ApiError &&
  error.status === 409 &&
  error.errors[0] === NOT_REQUESTED;

/**
 * The translation key of the toast for a failed decision, or `null` when nothing should be shown (an expired
 * session is handled once, centrally).
 */
export const getReactivationErrorKey = (error: unknown): string | null =>
  isReactivationAlreadyDecided(error)
    ? "reactivations.alreadyDecided"
    : getRegistrationErrorKey(error);
