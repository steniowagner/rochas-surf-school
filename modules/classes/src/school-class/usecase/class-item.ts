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
  /** The caller's latest enrolment in the class, or null when they have none. */
  myEnrolment: ClassItemEnrolment | null;
}

export interface ClassItemEnrolment {
  id: string;
  status: string;
  requestedAt: string;
  reason: string | null;
}

const collator = new Intl.Collator(undefined, { sensitivity: "base" });

/**
 * The answer shape of a class: ISO dates and the instructors sorted A–Z by name, ignoring case and accents.
 * Without a roster the class has no seats taken; without an enrolment the caller has none.
 */
export function toClassItem(
  view: ClassView,
  roster?: ClassRoster,
  myEnrolment?: ViewerEnrolment,
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
      .sort(
        (a, b) => collator.compare(a.name, b.name) || a.id.localeCompare(b.id),
      ),
    seatsTaken: roster?.seatsTaken ?? 0,
    students: (roster?.students ?? []).map((student) => ({ ...student })),
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
