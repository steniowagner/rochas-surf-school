import { ClassView } from "../provider";

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
  location: ClassView["location"];
  instructors: ClassView["instructors"];
}

const collator = new Intl.Collator(undefined, { sensitivity: "base" });

/** The answer shape of a class: ISO dates and the instructors sorted A–Z by name, ignoring case and accents. */
export function toClassItem(view: ClassView): ClassItem {
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
    location: { ...view.location },
    instructors: view.instructors
      .map((instructor) => ({ ...instructor }))
      .sort(
        (a, b) => collator.compare(a.name, b.name) || a.id.localeCompare(b.id),
      ),
  };
}
