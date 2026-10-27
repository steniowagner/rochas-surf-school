import { ClassActor } from "../../access";
import { ClassRoster, ClassView, ViewerEnrolment } from "../provider";

export interface ClassItem {
  id: string;
  discipline: ClassView["discipline"];
  level: ClassView["level"];
  startsAt: string;
  endsAt: string;
  capacity: number;
  notes: string | null;
  cancelledAt: string | null;
  cancellationMessage: string | null;
  /** ISO UTC, or null while it can't be worked out. */
  cancellationDeadline: string | null;
  location: ClassView["location"];
  instructors: ClassView["instructors"];
  /** All the seats taken: approved students plus guests. */
  seatsTaken: number;
  students: ClassRoster["students"];
  /** The trial guests; `name` is null for who may not see it and for every erased guest. */
  guests: ClassRoster["guests"];
  /** The caller's latest enrolment in the class, or null when they have none. */
  myEnrolment: ClassItemEnrolment | null;
}

export interface ClassItemEnrolment {
  id: string;
  status: string;
  requestedAt: string;
  reason: string | null;
}

/** Admins and the class's own instructors see the guests' names; everyone else sees "Trial". */
export function canSeeGuestNames(actor: ClassActor, view: ClassView): boolean {
  return actor.role === "admin" || view.instructors.some((instructor) => instructor.id === actor.id);
}

const collator = new Intl.Collator(undefined, { sensitivity: "base" });

/** A–Z ignoring case and accents; an erased person (no name) comes after the named ones. */
function compareNames(a: string | null, b: string | null): number {
  if (a === null || b === null) return (a === null ? 1 : 0) - (b === null ? 1 : 0);

  return collator.compare(a, b);
}

/**
 * The answer shape of a class: ISO dates and the instructors sorted A–Z by name, ignoring case and accents, the
 * erased ones (no name) last.
 * Without a roster the class has no seats taken; without an enrolment the caller has none. The guests' names
 * show only when `showGuestNames` (an admin, or an instructor of the class).
 */
export function toClassItem(
  view: ClassView,
  roster: ClassRoster | undefined,
  myEnrolment: ViewerEnrolment | undefined,
  showGuestNames: boolean,
): ClassItem {
  return {
    id: view.id,
    discipline: view.discipline,
    level: view.level,
    startsAt: view.startsAt.toISOString(),
    endsAt: view.endsAt.toISOString(),
    capacity: view.capacity,
    notes: view.notes,
    cancelledAt: view.cancelledAt ? view.cancelledAt.toISOString() : null,
    cancellationMessage: view.cancellationMessage,
    cancellationDeadline: view.cancellationDeadline ? view.cancellationDeadline.toISOString() : null,
    location: { ...view.location },
    instructors: view.instructors
      .map((instructor) => ({ ...instructor }))
      .sort((a, b) => compareNames(a.name, b.name) || a.id.localeCompare(b.id)),
    seatsTaken: roster?.seatsTaken ?? 0,
    students: (roster?.students ?? []).map((student) => ({ ...student })),
    guests: (roster?.guests ?? []).map((guest) => ({
      id: guest.id,
      name: showGuestNames ? guest.name : null,
    })),
    myEnrolment: myEnrolment
      ? {
          id: myEnrolment.id,
          status: myEnrolment.status,
          requestedAt: myEnrolment.requestedAt.toISOString(),
          reason: myEnrolment.reason ?? null,
        }
      : null,
  };
}
