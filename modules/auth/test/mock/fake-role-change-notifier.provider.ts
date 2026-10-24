import { RoleChangedEvent, RoleChangeNotifier } from "../../src";

export class FakeRoleChangeNotifier implements RoleChangeNotifier {
  readonly events: RoleChangedEvent[] = [];
  failWith: Error | null = null;

  async roleChanged(event: RoleChangedEvent): Promise<void> {
    this.events.push(event);
    if (this.failWith) throw this.failWith;
  }
}
