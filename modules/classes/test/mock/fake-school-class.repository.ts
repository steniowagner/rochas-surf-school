import { SchoolClass, SchoolClassRepository } from "../../src";

export class FakeSchoolClassRepository implements SchoolClassRepository {
  readonly createManyCalls: SchoolClass[][] = [];
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
}
