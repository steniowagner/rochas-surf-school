import { ClassAssigned, ClassAssignmentNotifier } from "../../src";

export class FakeClassAssignmentNotifier implements ClassAssignmentNotifier {
  readonly events: ClassAssigned[] = [];

  async classAssigned(event: ClassAssigned): Promise<void> {
    this.events.push(event);
  }
}
