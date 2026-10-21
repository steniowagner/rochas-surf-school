import { MyClassesReader, MyClassHistoryPage } from "../../src";

export class FakeMyClassesReader implements MyClassesReader {
  readonly currentCalls: { studentId: string; now: Date }[] = [];
  readonly historyCalls: { studentId: string; now: Date; page: number; perPage: number }[] = [];

  /**
   * `current` maps a student to the ids of their current classes; `history` to the ids of the classes they
   * took, already newest first, which the fake pages through.
   */
  constructor(
    private readonly current: Record<string, string[]> = {},
    private readonly history: Record<string, string[]> = {},
  ) {}

  async findCurrentClassIds(studentId: string, now: Date): Promise<string[]> {
    this.currentCalls.push({ studentId, now });

    return this.current[studentId] ?? [];
  }

  async findHistoryClassIds(
    studentId: string,
    now: Date,
    page: number,
    perPage: number,
  ): Promise<MyClassHistoryPage> {
    this.historyCalls.push({ studentId, now, page, perPage });

    const ids = this.history[studentId] ?? [];

    return { ids: ids.slice((page - 1) * perPage, page * perPage), total: ids.length };
  }
}
