import { PersonNotificationEraser } from "../../src";

export class FakePersonNotificationEraser implements PersonNotificationEraser {
  readonly erased: string[][] = [];
  failWith: Error | null = null;

  async erase(userIds: string[]): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.erased.push(userIds);
  }
}
