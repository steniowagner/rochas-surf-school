import { StudentNameReader } from "../../src";

export class FakeStudentNameReader implements StudentNameReader {
  constructor(private readonly names: Record<string, string> = {}) {}

  async findName(studentId: string): Promise<string | null> {
    return this.names[studentId] ?? null;
  }
}
