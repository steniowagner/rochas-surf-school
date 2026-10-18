import { ClassCancelled, ClassChangeNotifier, ClassDeleted, ClassEdited } from "../../src";

export class FakeClassChangeNotifier implements ClassChangeNotifier {
  readonly editedEvents: ClassEdited[] = [];
  readonly cancelledEvents: ClassCancelled[] = [];
  readonly deletedEvents: ClassDeleted[] = [];

  async classEdited(event: ClassEdited): Promise<void> {
    this.editedEvents.push(event);
  }

  async classCancelled(event: ClassCancelled): Promise<void> {
    this.cancelledEvents.push(event);
  }

  async classDeleted(event: ClassDeleted): Promise<void> {
    this.deletedEvents.push(event);
  }
}
