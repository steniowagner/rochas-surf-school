import { SchoolClass, SchoolClassRepository } from "../../src";

export class FakeSchoolClassRepository implements SchoolClassRepository {
  readonly createManyCalls: SchoolClass[][] = [];
  readonly updateCalls: SchoolClass[] = [];
  readonly cancelCalls: { id: string; at: Date; message: string | null }[] = [];
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

  async update(schoolClass: SchoolClass): Promise<boolean> {
    this.updateCalls.push(schoolClass);

    const stored = this.classes.find((item) => item.id === schoolClass.id);
    if (!stored || stored.cancelledAt) return false;

    this.classes = this.classes.map((item) =>
      item.id === schoolClass.id ? schoolClass : item,
    );

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
}
