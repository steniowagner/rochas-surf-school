import {
  DomainError,
  NotFoundError,
  UseCase,
  UuidRule,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { ClassActor, assertCanManageClasses } from "../../access";
import { LocationRepository } from "../../location";
import {
  CLASS_CAPACITY_MAX,
  CLASS_CAPACITY_MIN,
  CLASS_DISCIPLINES,
  CLASS_LEVELS,
  CLASS_NOTES_MAX,
  ClassDiscipline,
  ClassLevel,
  getClassState,
  isValidIsoDate,
  parseTimeOfDay,
  toInstant,
} from "../model";
import {
  ClassAssignmentNotifier,
  ClassChangeNotifier,
  ClockProvider,
  SchoolClassRepository,
  SeatCounter,
  TeacherLookup,
} from "../provider";

export interface EditClassIn {
  actor: ClassActor;
  id: string;
  discipline: unknown;
  level: unknown;
  /** `YYYY-MM-DD` in America/Fortaleza. */
  date: unknown;
  /** `HH:mm` in America/Fortaleza. */
  start: unknown;
  end: unknown;
  locationId: unknown;
  instructorIds: unknown;
  capacity: unknown;
  notes?: unknown;
}

export interface EditClassOut {
  id: string;
}

const TEACHER_ROLES = ["instructor", "admin"];
const uuidRule = new UuidRule();

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidRule.validate(value) === null;
}

function shapeErrors(input: EditClassIn): string[] {
  const errors: string[] = [];
  const notes = input.notes;
  const start = parseTimeOfDay(input.start);
  const end = parseTimeOfDay(input.end);

  if (!CLASS_DISCIPLINES.includes(input.discipline as ClassDiscipline)) {
    errors.push("class.discipline.invalid");
  }

  if (!CLASS_LEVELS.includes(input.level as ClassLevel)) {
    errors.push("class.level.invalid");
  }

  if (!isValidIsoDate(input.date)) {
    errors.push("class.date.invalid");
  }

  if (start === null || end === null) {
    errors.push("class.time.invalid");
  } else if (end <= start) {
    errors.push("class.time.endBeforeStart");
  }

  if (
    !Number.isInteger(input.capacity) ||
    (input.capacity as number) < CLASS_CAPACITY_MIN ||
    (input.capacity as number) > CLASS_CAPACITY_MAX
  ) {
    errors.push("class.capacity.invalid");
  }

  if (
    notes !== undefined &&
    notes !== null &&
    (typeof notes !== "string" || notes.trim().length > CLASS_NOTES_MAX)
  ) {
    errors.push("class.notes.max.length");
  }

  if (!Array.isArray(input.instructorIds) || input.instructorIds.length === 0) {
    errors.push("class.instructors.required");
  }

  if (typeof input.locationId !== "string" || input.locationId.trim() === "") {
    errors.push("class.location.required");
  }

  return errors;
}

function refusal(key: string, details?: Record<string, unknown>): DomainError {
  return new DomainError(key, 422, details);
}

export class EditClass implements UseCase<EditClassIn, EditClassOut> {
  constructor(
    private readonly schoolClassRepository: SchoolClassRepository,
    private readonly locationRepository: LocationRepository,
    private readonly teacherLookup: TeacherLookup,
    private readonly classAssignmentNotifier: ClassAssignmentNotifier,
    private readonly classChangeNotifier: ClassChangeNotifier,
    private readonly seatCounter: SeatCounter,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(input: EditClassIn): Promise<EditClassOut> {
    assertCanManageClasses(input.actor);

    const stored = isUuid(input.id)
      ? await this.schoolClassRepository.findById(input.id)
      : null;

    if (!stored) {
      throw new NotFoundError("class.notFound");
    }

    const errors = shapeErrors(input);
    if (errors.length > 0) {
      throw new ValidationException(errors.map((key) => new ValidationError(key)));
    }

    const now = this.clockProvider.now();
    const state = getClassState(stored.startsAt, stored.endsAt, now, stored.cancelledAt);

    if (state === "cancelled") {
      throw new DomainError("class.cancelled", 409);
    }

    if (state === "finished") {
      throw new DomainError("class.finished", 409);
    }

    const date = input.date as string;
    const startsAt = toInstant(date, parseTimeOfDay(input.start)!);
    const endsAt = toInstant(date, parseTimeOfDay(input.end)!);
    const locationId = input.locationId as string;
    const notes = typeof input.notes === "string" && input.notes.trim() !== "" ? input.notes.trim() : null;
    const instructorIds = [...new Set(input.instructorIds as unknown[])];
    const capacity = input.capacity as number;

    const classChanged =
      input.discipline !== stored.discipline ||
      input.level !== stored.level ||
      startsAt.getTime() !== stored.startsAt.getTime() ||
      endsAt.getTime() !== stored.endsAt.getTime() ||
      locationId !== stored.locationId ||
      capacity !== stored.capacity ||
      notes !== stored.notes;

    if (state === "started" && classChanged) {
      throw new DomainError("class.started", 409);
    }

    if (!isUuid(locationId) || !(await this.locationRepository.findById(locationId))) {
      throw refusal("class.location.notFound");
    }

    const before = stored.instructorIds;
    const added = instructorIds.filter((id) => !before.includes(id as string)) as string[];
    await this.assertTeachers(added);

    if (state === "not-started" && startsAt.getTime() <= now.getTime()) {
      throw refusal("class.startsAt.past");
    }

    const seatsTaken = await this.seatCounter.countSeatsTaken(stored.id);
    if (capacity < seatsTaken) {
      throw refusal("class.capacity.belowSeatsTaken", { seatsTaken });
    }

    const after = instructorIds as string[];
    const removed = before.filter((id) => !after.includes(id));
    const instructorsChanged = added.length > 0 || removed.length > 0;

    if (!classChanged && !instructorsChanged) {
      return { id: stored.id };
    }

    const edited = stored.clone({
      discipline: input.discipline as ClassDiscipline,
      level: input.level as ClassLevel,
      startsAt,
      endsAt,
      locationId,
      instructorIds: after,
      capacity,
      notes,
      updatedAt: now,
    });
    edited.validate();

    if (!(await this.schoolClassRepository.update(edited, classChanged))) {
      throw new DomainError("class.cancelled", 409);
    }

    const others = (ids: string[]) => ids.filter((id) => id !== input.actor.id);
    const { discipline } = edited;
    const kept = others(after.filter((id) => before.includes(id)));

    if (classChanged) {
      await this.notify(kept, (instructorIds) =>
        this.classChangeNotifier.classEdited({
          instructorIds,
          classId: edited.id,
          discipline,
          startsAt,
        }),
      );
    }

    await this.notify(others(added), (instructorIds) =>
      this.classAssignmentNotifier.classAssigned({
        instructorIds,
        count: 1,
        discipline,
      }),
    );
    await this.notify(others(removed), (instructorIds) =>
      this.classAssignmentNotifier.classUnassigned({
        instructorIds,
        classId: edited.id,
        discipline,
        startsAt,
      }),
    );

    return { id: edited.id };
  }

  private async assertTeachers(addedIds: string[]): Promise<void> {
    if (addedIds.length === 0) return;

    if (!addedIds.every(isUuid)) {
      throw refusal("class.instructors.invalid");
    }

    const teachers = await this.teacherLookup.findTeachers(addedIds);
    const valid = addedIds.every((id) =>
      teachers.some(
        (teacher) =>
          teacher.id === id &&
          teacher.status === "approved" &&
          TEACHER_ROLES.includes(teacher.role),
      ),
    );

    if (!valid) {
      throw refusal("class.instructors.invalid");
    }
  }

  /** A failed notification never changes the answer; the adapter logs it. */
  private async notify(
    instructorIds: string[],
    send: (instructorIds: string[]) => Promise<void>,
  ): Promise<void> {
    if (instructorIds.length === 0) return;

    try {
      await send(instructorIds);
    } catch {
      // swallowed on purpose
    }
  }
}
