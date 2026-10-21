import { StudentLookup } from "../../src";

export class FakeStudentLookup implements StudentLookup {
  constructor(private readonly studentIds: string[] = []) {}

  async isApprovedStudent(studentId: string): Promise<boolean> {
    return this.studentIds.includes(studentId);
  }
}
