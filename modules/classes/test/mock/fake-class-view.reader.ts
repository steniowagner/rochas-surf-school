import { ClassView, ClassViewReader } from "../../src";

export class FakeClassViewReader implements ClassViewReader {
  readonly findByIdCalls: string[] = [];
  private views: ClassView[];

  constructor(views: ClassView[] = []) {
    this.views = [...views];
  }

  async findStartingBetween(from: Date, to: Date): Promise<ClassView[]> {
    return this.views.filter(
      (item) =>
        item.startsAt.getTime() >= from.getTime() &&
        item.startsAt.getTime() < to.getTime(),
    );
  }

  async findById(id: string): Promise<ClassView | null> {
    this.findByIdCalls.push(id);

    return this.views.find((item) => item.id === id) ?? null;
  }
}
