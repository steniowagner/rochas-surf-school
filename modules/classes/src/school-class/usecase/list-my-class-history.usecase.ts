import { UseCase } from "@rochas-surf-school/shared";
import { ClassActor } from "../../access";
import {
  ClassRosterReader,
  ClassView,
  ClassViewReader,
  ClockProvider,
  MyClassesReader,
  ViewerEnrolmentReader,
} from "../provider";
import { toHistoryPeriod } from "./class-history-period";
import { ClassItem } from "./class-item";
import { assertIsStudent, toMyClassItems } from "./list-my-classes.usecase";

export interface ListMyClassHistoryIn {
  actor: ClassActor;
  /** The raw query strings: the first and the last America/Fortaleza day of the period, `YYYY-MM-DD`. */
  from?: unknown;
  to?: unknown;
}

export interface ListMyClassHistoryOut {
  items: ClassItem[];
}

export class ListMyClassHistory implements UseCase<ListMyClassHistoryIn, ListMyClassHistoryOut> {
  constructor(
    private readonly myClassesReader: MyClassesReader,
    private readonly classViewReader: ClassViewReader,
    private readonly classRosterReader: ClassRosterReader,
    private readonly viewerEnrolmentReader: ViewerEnrolmentReader,
    private readonly clock: ClockProvider,
  ) {}

  async execute(input: ListMyClassHistoryIn): Promise<ListMyClassHistoryOut> {
    assertIsStudent(input.actor);

    const period = toHistoryPeriod(input.from, input.to);

    const ids = await this.myClassesReader.findHistoryClassIds(
      input.actor.id,
      this.clock.now(),
      period.from,
      period.to,
    );

    const found = ids.length > 0 ? await this.classViewReader.findByIds(ids) : [];
    const byId = new Map(found.map((view) => [view.id, view]));
    const views = ids
      .map((id) => byId.get(id))
      .filter((view): view is ClassView => view !== undefined);

    return {
      items: await toMyClassItems(
        input.actor,
        views,
        this.classRosterReader,
        this.viewerEnrolmentReader,
      ),
    };
  }
}
