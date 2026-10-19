import { ClassEnrolmentsCloser } from "../../src";

export class FakeClassEnrolmentsCloser implements ClassEnrolmentsCloser {
  readonly calls: string[] = [];

  /** `studentIdsByClass` maps a class id to the students whose open enrolment it closes. */
  constructor(private readonly studentIdsByClass: Record<string, string[]> = {}) {}

  async closeOpenEnrolments(classId: string): Promise<string[]> {
    this.calls.push(classId);

    return this.studentIdsByClass[classId] ?? [];
  }
}
