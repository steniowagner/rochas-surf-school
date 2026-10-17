export type ClassState = "not-started" | "started" | "finished" | "cancelled";

/**
 * Cancelled whenever `cancelledAt` is set, whatever the clock says; otherwise not started before the start,
 * started from it, finished from the end. Reads no clock of its own.
 */
export function getClassState(
  startsAt: Date,
  endsAt: Date,
  now: Date,
  cancelledAt?: Date | null,
): ClassState {
  if (cancelledAt) return "cancelled";
  if (now.getTime() < startsAt.getTime()) return "not-started";
  if (now.getTime() < endsAt.getTime()) return "started";

  return "finished";
}
