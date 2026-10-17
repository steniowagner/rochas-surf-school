import { ClassChangeNotifier, ClassEdited } from "../../src";

export class FakeClassChangeNotifier implements ClassChangeNotifier {
  readonly editedEvents: ClassEdited[] = [];

  async classEdited(event: ClassEdited): Promise<void> {
    this.editedEvents.push(event);
  }
}
