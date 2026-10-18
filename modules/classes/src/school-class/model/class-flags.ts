import type { ClassState } from "./class-state";

/**
 * The "no instructor" flag shown to admins: a class that hasn't started and has nobody to teach it. Computed,
 * never stored, so it disappears once the class starts, is cancelled or gets an instructor.
 */
export function isWithoutInstructor(instructorCount: number, state: ClassState): boolean {
  return instructorCount === 0 && state === "not-started";
}
