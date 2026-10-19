import { ClassRoster, ClassRosterReader, ClassStudent } from "../../src";

export class FakeClassRosterReader implements ClassRosterReader {
  readonly calls: { classIds: string[]; studentsLimit?: number }[] = [];

  /** `rosters` keeps all the students of each class; `seatsTaken` defaults to their count. */
  constructor(
    private readonly rosters: Record<
      string,
      { seatsTaken?: number; students: ClassStudent[] }
    > = {},
  ) {}

  async findRosters(
    classIds: string[],
    studentsLimit?: number,
  ): Promise<Map<string, ClassRoster>> {
    this.calls.push({ classIds, studentsLimit });

    const found = new Map<string, ClassRoster>();

    for (const id of classIds) {
      const roster = this.rosters[id];

      if (roster) {
        found.set(id, {
          seatsTaken: roster.seatsTaken ?? roster.students.length,
          students: roster.students.slice(0, studentsLimit),
        });
      }
    }

    return found;
  }
}
