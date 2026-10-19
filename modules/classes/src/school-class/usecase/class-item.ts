import { ClassRoster, ClassView } from "../provider";

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
}

const collator = new Intl.Collator(undefined, { sensitivity: "base" });

/**
 * The answer shape of a class: ISO dates and the instructors sorted A–Z by name, ignoring case and accents.
 * Without a roster the class has no seats taken.
 */
export function toClassItem(view: ClassView, roster?: ClassRoster): ClassItem {
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
  };
}
