import { ClassesWithoutInstructor, NoInstructorNotifier } from "../../src";

export class FakeNoInstructorNotifier implements NoInstructorNotifier {
  readonly events: ClassesWithoutInstructor[] = [];
  failNext = false;

  async classesWithoutInstructor(event: ClassesWithoutInstructor): Promise<void> {
    this.events.push(event);

    if (this.failNext) {
      this.failNext = false;
      throw new Error("classesWithoutInstructor failed");
    }
  }
}
