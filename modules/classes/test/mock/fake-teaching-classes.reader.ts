import { TeachingClassesReader } from "../../src";

export class FakeTeachingClassesReader implements TeachingClassesReader {
  readonly currentCalls: { teacherId: string; now: Date }[] = [];
  readonly historyCalls: { teacherId: string; now: Date; from: Date; to: Date }[] = [];
  readonly teachesAnyCalls: string[] = [];

  /**
   * `current` maps a person to the ids of the classes they teach that haven't ended, answered as they are;
   * `teaching` lists the people who teach any class (everyone in `current` counts too); `history` maps a person
   * to the ids of the classes they taught, answered as they are.
   */
  constructor(
    private readonly current: Record<string, string[]> = {},
    private readonly teaching: string[] = [],
    private readonly history: Record<string, string[]> = {},
  ) {}

  async findCurrentClassIds(teacherId: string, now: Date): Promise<string[]> {
    this.currentCalls.push({ teacherId, now });

    return this.current[teacherId] ?? [];
  }

  async findHistoryClassIds(teacherId: string, now: Date, from: Date, to: Date): Promise<string[]> {
    this.historyCalls.push({ teacherId, now, from, to });

    return this.history[teacherId] ?? [];
  }

  async teachesAny(teacherId: string): Promise<boolean> {
    this.teachesAnyCalls.push(teacherId);

    return this.teaching.includes(teacherId) || (this.current[teacherId]?.length ?? 0) > 0;
  }
}
