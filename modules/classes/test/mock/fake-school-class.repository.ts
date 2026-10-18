import { SchoolClass, SchoolClassRepository } from "../../src";

export class FakeSchoolClassRepository implements SchoolClassRepository {
  readonly createManyCalls: SchoolClass[][] = [];
  readonly updateCalls: SchoolClass[] = [];
  readonly clearDeadlineCalls: boolean[] = [];
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

  async update(schoolClass: SchoolClass, clearDeadline: boolean): Promise<boolean> {
    this.updateCalls.push(schoolClass);
    this.clearDeadlineCalls.push(clearDeadline);

    const stored = this.classes.find((item) => item.id === schoolClass.id);
    if (!stored || stored.cancelledAt) return false;

    const written = clearDeadline
      ? schoolClass.clone({
          cancellationDeadline: null,
          deadlineAttempts: 0,
          deadlineNextAttemptAt: null,
          deadlineRevision: stored.deadlineRevision + 1,
          updatedAt: schoolClass.updatedAt,
        })
      : schoolClass;

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
}
