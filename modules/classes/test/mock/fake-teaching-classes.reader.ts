import { TeachingClassesReader } from "../../src";

export class FakeTeachingClassesReader implements TeachingClassesReader {
  readonly currentCalls: { teacherId: string; now: Date }[] = [];
  readonly teachesAnyCalls: string[] = [];

  /**
   * `current` maps a person to the ids of the classes they teach that haven't ended, answered as they are;
   * `teaching` lists the people who teach any class (everyone in `current` counts too).
   */
  constructor(
    private readonly current: Record<string, string[]> = {},
    private readonly teaching: string[] = [],
  ) {}

  async findCurrentClassIds(teacherId: string, now: Date): Promise<string[]> {
    this.currentCalls.push({ teacherId, now });

    return this.current[teacherId] ?? [];
  }

  async teachesAny(teacherId: string): Promise<boolean> {
    this.teachesAnyCalls.push(teacherId);

    return this.teaching.includes(teacherId) || (this.current[teacherId]?.length ?? 0) > 0;
  }
}
