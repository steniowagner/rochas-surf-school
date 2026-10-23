import { MyClassesReader } from "../../src";

export class FakeMyClassesReader implements MyClassesReader {
  readonly currentCalls: { studentId: string; now: Date }[] = [];
  readonly historyCalls: { studentId: string; now: Date; from: Date; to: Date }[] = [];

  /**
   * `current` maps a student to the ids of their current classes; `history` to the ids of the classes they
   * took, already newest first and in the period asked, which the fake answers as they are.
   */
  constructor(
    private readonly current: Record<string, string[]> = {},
    private readonly history: Record<string, string[]> = {},
  ) {}

  async findCurrentClassIds(studentId: string, now: Date): Promise<string[]> {
    this.currentCalls.push({ studentId, now });

    return this.current[studentId] ?? [];
  }

  async findHistoryClassIds(studentId: string, now: Date, from: Date, to: Date): Promise<string[]> {
    this.historyCalls.push({ studentId, now, from, to });

    return this.history[studentId] ?? [];
  }
}
