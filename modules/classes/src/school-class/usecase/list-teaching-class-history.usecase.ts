import { UseCase } from "@rochas-surf-school/shared";
import { ClassActor } from "../../access";
import {
  CLASS_CARD_STUDENTS_LIMIT,
  ClassRosterReader,
  ClassView,
  ClassViewReader,
  ClockProvider,
  TeachingClassesReader,
} from "../provider";
import { toHistoryPeriod } from "./class-history-period";
import { ClassItem, toClassItem } from "./class-item";
import { assertIsTeacher } from "./list-teaching-classes.usecase";

export interface ListTeachingClassHistoryIn {
  actor: ClassActor;
  /** The raw query strings: the first and the last America/Fortaleza day of the period, `YYYY-MM-DD`. */
  from?: unknown;
  to?: unknown;
}

export interface ListTeachingClassHistoryOut {
  items: ClassItem[];
}

export class ListTeachingClassHistory
  implements UseCase<ListTeachingClassHistoryIn, ListTeachingClassHistoryOut>
{
  constructor(
    private readonly teachingClassesReader: TeachingClassesReader,
    private readonly classViewReader: ClassViewReader,
    private readonly classRosterReader: ClassRosterReader,
    private readonly clock: ClockProvider,
  ) {}

  async execute(input: ListTeachingClassHistoryIn): Promise<ListTeachingClassHistoryOut> {
    assertIsTeacher(input.actor);

    const period = toHistoryPeriod(input.from, input.to);
    const ids = await this.teachingClassesReader.findHistoryClassIds(
      input.actor.id,
      this.clock.now(),
      period.from,
      period.to,
    );

    if (ids.length === 0) return { items: [] };

    const found = await this.classViewReader.findByIds(ids);
    const byId = new Map(found.map((view) => [view.id, view]));
    const views = ids
      .map((id) => byId.get(id))
      .filter((view): view is ClassView => view !== undefined);
    const rosters = await this.classRosterReader.findRosters(
      views.map((view) => view.id),
      CLASS_CARD_STUDENTS_LIMIT,
    );

    // The caller taught every class listed, so they see the guests' names; teachers have no enrolment.
    return {
      items: views.map((view) => toClassItem(view, rosters.get(view.id), undefined, true)),
    };
  }
}
