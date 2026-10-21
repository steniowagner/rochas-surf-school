import { ClassGuest, ClassRoster, ClassRosterReader, ClassStudent } from "../../src";

export class FakeClassRosterReader implements ClassRosterReader {
  readonly calls: { classIds: string[]; studentsLimit?: number }[] = [];

  /** `rosters` keeps all the students of each class; `seatsTaken` defaults to the students plus the guests. */
  constructor(
    private readonly rosters: Record<
      string,
      { seatsTaken?: number; students: ClassStudent[]; guests?: ClassGuest[] }
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
          seatsTaken: roster.seatsTaken ?? roster.students.length + (roster.guests?.length ?? 0),
          students: roster.students.slice(0, studentsLimit),
          guests: roster.guests ?? [],
        });
      }
    }

    return found;
  }
}
