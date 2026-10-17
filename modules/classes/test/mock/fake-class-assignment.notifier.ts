import {
  ClassAssigned,
  ClassAssignmentNotifier,
  ClassUnassigned,
} from "../../src";

export class FakeClassAssignmentNotifier implements ClassAssignmentNotifier {
  readonly events: ClassAssigned[] = [];
  readonly unassignedEvents: ClassUnassigned[] = [];

  async classAssigned(event: ClassAssigned): Promise<void> {
    this.events.push(event);
  }

  async classUnassigned(event: ClassUnassigned): Promise<void> {
    this.unassignedEvents.push(event);
  }
}
