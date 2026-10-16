export type ClassState = "not-started" | "started" | "finished";

/** Not started before the start, started from it, finished from the end. Reads no clock of its own. */
export function getClassState(startsAt: Date, endsAt: Date, now: Date): ClassState {
  if (now.getTime() < startsAt.getTime()) return "not-started";
  if (now.getTime() < endsAt.getTime()) return "started";

  return "finished";
}
