import {
  ClassDiscipline,
  SchoolClass,
  SchoolClassRepository,
  SchoolClassState,
  SchoolClassUpdateOptions,
} from "../../src";

export class FakeSchoolClassRepository implements SchoolClassRepository {
  readonly createManyCalls: SchoolClass[][] = [];
  readonly updateCalls: SchoolClass[] = [];
  readonly clearDeadlineCalls: boolean[] = [];
  readonly clearReminderCalls: boolean[] = [];
  readonly cancelCalls: { id: string; at: Date; message: string | null }[] = [];
  readonly deleteCalls: { id: string; now: Date }[] = [];
  readonly removeInstructorCalls: { userId: string; classIds: string[] }[] = [];
  failNextCreate = false;
  private classes: SchoolClass[];

  constructor(classes: SchoolClass[] = []) {
    this.classes = [...classes];
  }

  get all(): SchoolClass[] {
    return [...this.classes];
  }

  async createMany(classes: SchoolClass[]): Promise<void> {
    if (this.failNextCreate) {
      this.failNextCreate = false;
      throw new Error("createMany failed");
    }

    this.createManyCalls.push(classes);
    this.classes.push(...classes);
  }

  async findStartingBetween(from: Date, to: Date): Promise<SchoolClass[]> {
    return this.classes.filter(
      (item) =>
        item.startsAt.getTime() >= from.getTime() &&
        item.startsAt.getTime() < to.getTime(),
    );
  }

  async findById(id: string): Promise<SchoolClass | null> {
    return this.classes.find((item) => item.id === id) ?? null;
  }

  async update(schoolClass: SchoolClass, options: SchoolClassUpdateOptions): Promise<boolean> {
    const clearDeadline = options.clearDeadline ?? false;
    const clearReminder = options.clearReminder ?? false;
    this.updateCalls.push(schoolClass);
    this.clearDeadlineCalls.push(clearDeadline);
    this.clearReminderCalls.push(clearReminder);

    const stored = this.classes.find((item) => item.id === schoolClass.id);
    if (!stored || stored.cancelledAt) return false;

    // Like the database, the reminder mark is never written from the edited class.
    const written = schoolClass.clone({
      ...(clearDeadline
        ? {
            cancellationDeadline: null,
            deadlineAttempts: 0,
            deadlineNextAttemptAt: null,
            deadlineRevision: stored.deadlineRevision + 1,
          }
        : {}),
      reminderSentAt: clearReminder ? null : stored.reminderSentAt,
      updatedAt: schoolClass.updatedAt,
    });

    this.classes = this.classes.map((item) => (item.id === schoolClass.id ? written : item));

    return true;
  }

  async cancel(id: string, at: Date, message: string | null): Promise<boolean> {
    this.cancelCalls.push({ id, at, message });

    const stored = this.classes.find((item) => item.id === id);
    if (!stored || stored.cancelledAt) return false;

    this.classes = this.classes.map((item) =>
      item.id === id ? item.clone({ cancelledAt: at, cancellationMessage: message }) : item,
    );

    return true;
  }

  async delete(id: string, now: Date): Promise<boolean> {
    this.deleteCalls.push({ id, now });

    const stored = this.classes.find((item) => item.id === id);
    if (!stored || stored.cancelledAt || stored.startsAt.getTime() <= now.getTime()) return false;

    this.classes = this.classes.filter((item) => item.id !== id);

    return true;
  }

  async findUpcomingTaughtBy(userId: string, now: Date): Promise<SchoolClass[]> {
    return this.classes
      .filter(
        (item) =>
          item.instructorIds.includes(userId) &&
          !item.cancelledAt &&
          item.startsAt.getTime() > now.getTime(),
      )
      .sort(
        (a, b) =>
          a.startsAt.getTime() - b.startsAt.getTime() || a.id.localeCompare(b.id),
      );
  }

  async removeInstructor(userId: string, classIds: string[]): Promise<void> {
    if (classIds.length === 0) return;

    this.removeInstructorCalls.push({ userId, classIds });
    this.classes = this.classes.map((item) =>
      classIds.includes(item.id)
        ? item.clone({ instructorIds: item.instructorIds.filter((id) => id !== userId) })
        : item,
    );
  }

  async findNeedingDeadline(query: {
    now: Date;
    disciplines: ClassDiscipline[];
    limit: number;
  }): Promise<SchoolClass[]> {
    const { now, disciplines, limit } = query;

    return this.classes
      .filter(
        (item) =>
          disciplines.includes(item.discipline) &&
          item.startsAt.getTime() > now.getTime() &&
          !item.cancelledAt &&
          !item.cancellationDeadline &&
          (!item.deadlineNextAttemptAt || item.deadlineNextAttemptAt.getTime() <= now.getTime()),
      )
      .sort(
        (a, b) =>
          Number(a.deadlineAttempts > 0) - Number(b.deadlineAttempts > 0) ||
          a.startsAt.getTime() - b.startsAt.getTime() ||
          a.id.localeCompare(b.id),
      )
      .slice(0, limit);
  }

  async saveDeadline(id: string, revision: number, deadline: Date): Promise<boolean> {
    return this.writeDeadline(id, revision, {
      cancellationDeadline: deadline,
      deadlineAttempts: 0,
      deadlineNextAttemptAt: null,
    });
  }

  async recordDeadlineFailure(
    id: string,
    revision: number,
    attempts: number,
    nextAttemptAt: Date,
  ): Promise<boolean> {
    return this.writeDeadline(id, revision, {
      deadlineAttempts: attempts,
      deadlineNextAttemptAt: nextAttemptAt,
    });
  }

  private writeDeadline(
    id: string,
    revision: number,
    changes: Partial<SchoolClassState>,
  ): boolean {
    const stored = this.classes.find((item) => item.id === id);

    if (!stored || stored.cancelledAt || stored.deadlineRevision !== revision) return false;

    this.classes = this.classes.map((item) =>
      item.id === id ? item.clone({ ...changes, updatedAt: item.updatedAt }) : item,
    );

    return true;
  }
}
