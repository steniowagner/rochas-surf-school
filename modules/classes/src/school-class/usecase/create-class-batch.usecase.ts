import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import {
  DomainError,
  UseCase,
  UuidRule,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { ClassActor, assertCanManageClasses } from "../../access";
import { LocationRepository } from "../../location";
import {
  CLASS_BATCH_MAX,
  CLASS_CAPACITY_MAX,
  CLASS_CAPACITY_MIN,
  CLASS_DISCIPLINES,
  CLASS_LEVELS,
  CLASS_NOTES_MAX,
  CLASS_TIME_ZONE,
  ClassDiscipline,
  ClassLevel,
  SchoolClass,
  TimeRange,
  hasOverlappingTimeRanges,
  isValidDateRange,
  isValidTimeRange,
  isValidExcludedDates,
  isValidWeekdays,
  listBatchClasses,
  timeRangeEndsAfterStart,
} from "../model";
import {
  ClassAssignmentNotifier,
  ClockProvider,
  SchoolClassRepository,
  TeacherLookup,
} from "../provider";

export interface CreateClassBatchIn {
  actor: ClassActor;
  discipline: unknown;
  level: unknown;
  startDate: unknown;
  endDate: unknown;
  weekdays: unknown;
  /** Optional: `YYYY-MM-DD` dates of the range to leave out. */
  excludedDates?: unknown;
  /** Optional boolean: leave out the classes that have already started instead of refusing the batch. */
  skipPast?: unknown;
  timeRanges: unknown;
  locationId: unknown;
  instructorIds: unknown;
  capacity: unknown;
  notes?: unknown;
}

export interface CreateClassBatchOut {
  count: number;
}

const TEACHER_ROLES = ["instructor", "admin"];
const uuidRule = new UuidRule();

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidRule.validate(value) === null;
}

function timeRangeErrors(timeRanges: unknown): string[] {
  if (!Array.isArray(timeRanges) || timeRanges.length === 0) {
    return ["class.timeRanges.required"];
  }

  const errors: string[] = [];
  const valid = timeRanges.filter(isValidTimeRange);

  if (valid.length !== timeRanges.length) {
    errors.push("class.timeRanges.invalid");
  }

  const ordered: TimeRange[] = valid.filter(timeRangeEndsAfterStart);

  if (ordered.length !== valid.length) {
    errors.push("class.timeRanges.endBeforeStart");
  }

  if (hasOverlappingTimeRanges(ordered)) {
    errors.push("class.timeRanges.overlap");
  }

  return errors;
}

function shapeErrors(input: CreateClassBatchIn): string[] {
  const errors: string[] = [];
  const notes = input.notes;

  if (!CLASS_DISCIPLINES.includes(input.discipline as ClassDiscipline)) {
    errors.push("class.discipline.invalid");
  }

  if (!CLASS_LEVELS.includes(input.level as ClassLevel)) {
    errors.push("class.level.invalid");
  }

  if (!isValidDateRange(input.startDate, input.endDate)) {
    errors.push("class.dates.invalid");
  }

  if (!isValidWeekdays(input.weekdays)) {
    errors.push("class.weekdays.invalid");
  }

  if (!isValidExcludedDates(input.excludedDates)) {
    errors.push("class.excludedDates.invalid");
  }

  if (
    input.skipPast !== undefined &&
    input.skipPast !== null &&
    typeof input.skipPast !== "boolean"
  ) {
    errors.push("class.skipPast.invalid");
  }

  errors.push(...timeRangeErrors(input.timeRanges));

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

export class CreateClassBatch
  implements UseCase<CreateClassBatchIn, CreateClassBatchOut>
{
  constructor(
    private readonly schoolClassRepository: SchoolClassRepository,
    private readonly locationRepository: LocationRepository,
    private readonly teacherLookup: TeacherLookup,
    private readonly classAssignmentNotifier: ClassAssignmentNotifier,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(input: CreateClassBatchIn): Promise<CreateClassBatchOut> {
    assertCanManageClasses(input.actor);

    const errors = shapeErrors(input);
    if (errors.length > 0) {
      throw new ValidationException(errors.map((key) => new ValidationError(key)));
    }

    const locationId = input.locationId as string;
    const location = isUuid(locationId) ? await this.locationRepository.findById(locationId) : null;
    if (!location) {
      throw refusal("class.location.notFound");
    }

    if (location.isArchived) {
      throw refusal("class.location.archived");
    }

    const instructorIds = [...new Set(input.instructorIds as unknown[])];
    await this.assertTeachers(instructorIds);

    const discipline = input.discipline as ClassDiscipline;
    const skipPast = input.skipPast === true;
    const now = this.clockProvider.now().getTime();
    const timeRanges = input.timeRanges as TimeRange[];
    // With skipPast, the days before today are dropped before the listing cap, so the classes that
    // have started can only be today's, one per time range at most, and the cap's margin holds.
    const today = format(new Date(now), "yyyy-MM-dd", { in: tz(CLASS_TIME_ZONE) });
    const startDate = input.startDate as string;
    const listed = listBatchClasses(
      {
        startDate: skipPast && today > startDate ? today : startDate,
        endDate: input.endDate as string,
        weekdays: input.weekdays as number[],
        excludedDates: (input.excludedDates as string[] | null | undefined) ?? undefined,
        timeRanges,
      },
      CLASS_BATCH_MAX + (skipPast ? timeRanges.length : 0),
    );
    const batch = skipPast
      ? listed.filter((item) => item.startsAt.getTime() > now)
      : listed;

    if (batch.length === 0) {
      throw refusal("class.batch.empty");
    }

    if (batch.length > CLASS_BATCH_MAX) {
      throw refusal("class.batch.tooLarge", { max: CLASS_BATCH_MAX });
    }

    if (batch.some((item) => item.startsAt.getTime() <= now)) {
      throw refusal("class.startsAt.past");
    }

    const notes =
      typeof input.notes === "string" && input.notes.trim() !== ""
        ? input.notes.trim()
        : null;
    const classes = batch.map((item) => {
      const schoolClass = new SchoolClass({
        discipline,
        level: input.level as ClassLevel,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        locationId,
        instructorIds: instructorIds as string[],
        capacity: input.capacity as number,
        notes,
        createdBy: input.actor.id,
      });
      schoolClass.validate();
      return schoolClass;
    });

    await this.schoolClassRepository.createMany(classes);
    await this.notifyInstructors(
      (instructorIds as string[]).filter((id) => id !== input.actor.id),
      classes.length,
      discipline,
    );

    return { count: classes.length };
  }

  private async assertTeachers(instructorIds: unknown[]): Promise<void> {
    if (!instructorIds.every(isUuid)) {
      throw refusal("class.instructors.invalid");
    }

    const teachers = await this.teacherLookup.findTeachers(instructorIds);
    const valid = instructorIds.every((id) =>
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

  private async notifyInstructors(
    instructorIds: string[],
    count: number,
    discipline: ClassDiscipline,
  ): Promise<void> {
    if (instructorIds.length === 0) return;

    try {
      await this.classAssignmentNotifier.classAssigned({
        instructorIds,
        count,
        discipline,
      });
    } catch {
      // A failed notification never changes the answer; the adapter logs it.
    }
  }
}
