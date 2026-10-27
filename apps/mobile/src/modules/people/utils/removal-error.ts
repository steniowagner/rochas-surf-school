import { ApiError } from "@/services/api";

import { getRoleChangeErrorKey } from "./role-change-error";

const RESTORE_CONFLICT_KEYS: Record<string, string> = {
  "user.status.notRemoved": "people.removed.errors.notRemoved",
  "removal.window.ended": "people.removed.errors.windowEnded",
};

/** The toast for a failed removal: the role change's (`lastAdmin`, `notApproved`, network, generic). */
export const getRemovalErrorKey = getRoleChangeErrorKey;

/** The toast for a failed restore, or `null` when nothing should be shown (an expired session). */
export const getRestoreErrorKey = (error: unknown): string | null => {
  if (error instanceof ApiError && error.status === 409) {
    const key = RESTORE_CONFLICT_KEYS[error.errors[0] ?? ""];
    if (key) return key;
  }

  return getRoleChangeErrorKey(error);
};

/** A restore refused for what the removed accounts say now: they reload to show the truth. */
export const isStaleRestoreError = (error: unknown): boolean =>
  error instanceof ApiError &&
  error.status === 409 &&
  (error.errors[0] ?? "") in RESTORE_CONFLICT_KEYS;
