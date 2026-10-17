import { ClassCancelled, ClassChangeNotifier, ClassEdited } from "../../src";

export class FakeClassChangeNotifier implements ClassChangeNotifier {
  readonly editedEvents: ClassEdited[] = [];
  readonly cancelledEvents: ClassCancelled[] = [];

  async classEdited(event: ClassEdited): Promise<void> {
    this.editedEvents.push(event);
  }

  async classCancelled(event: ClassCancelled): Promise<void> {
    this.cancelledEvents.push(event);
  }
}
