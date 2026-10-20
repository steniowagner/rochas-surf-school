import { EnrolmentClass, EnrolmentClassReader } from "../../src";

export class FakeEnrolmentClassReader implements EnrolmentClassReader {
  constructor(private readonly classes: EnrolmentClass[] = []) {}

  async findById(id: string): Promise<EnrolmentClass | null> {
    return this.classes.find((item) => item.id === id) ?? null;
  }
}
