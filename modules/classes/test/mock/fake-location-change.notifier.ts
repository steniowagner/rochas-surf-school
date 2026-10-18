import { LocationChanged, LocationChangeNotifier } from "../../src";

export class FakeLocationChangeNotifier implements LocationChangeNotifier {
  readonly events: LocationChanged[] = [];
  fail = false;

  async locationChanged(event: LocationChanged): Promise<void> {
    if (this.fail) throw new Error("notifier failed");

    this.events.push(event);
  }
}
