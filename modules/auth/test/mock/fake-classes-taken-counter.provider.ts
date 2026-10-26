import { ClassesTakenCounter } from "../../src";

export class FakeClassesTakenCounter implements ClassesTakenCounter {
  readonly calls: { userIds: string[]; now: Date }[] = [];

  constructor(private readonly taken: Record<string, number> = {}) {}

  async countTaken(userIds: string[], now: Date): Promise<Record<string, number>> {
    this.calls.push({ userIds, now });

    return Object.fromEntries(userIds.map((id) => [id, this.taken[id] ?? 0]));
  }
}
