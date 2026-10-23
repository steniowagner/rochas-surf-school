import {
  UseCase,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { ClassActor } from "../../access";
import { isValidIsoDate, toInstant } from "../model";
import {
  ClassRosterReader,
  ClassView,
  ClassViewReader,
  ClockProvider,
  MyClassesReader,
  ViewerEnrolmentReader,
} from "../provider";
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

/** The longest period, in days counting both ends: the largest month grid. */
export const MY_CLASS_HISTORY_MAX_DAYS = 42;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The `YYYY-MM-DD` day after a real `YYYY-MM-DD` date. */
function nextDay(date: string): string {
  return new Date(Date.parse(date) + DAY_MS).toISOString().slice(0, 10);
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

    const { from, to } = input;
    const errors: ValidationError[] = [];

    if (!isValidIsoDate(from)) errors.push(new ValidationError("class.from.invalid"));
    if (!isValidIsoDate(to)) errors.push(new ValidationError("class.to.invalid"));
    if (!isValidIsoDate(from) || !isValidIsoDate(to)) throw new ValidationException(errors);

    const days = (Date.parse(to) - Date.parse(from)) / DAY_MS + 1;

    if (days < 1 || days > MY_CLASS_HISTORY_MAX_DAYS) {
      throw new ValidationException([new ValidationError("class.range.invalid")]);
    }

    const ids = await this.myClassesReader.findHistoryClassIds(
      input.actor.id,
      this.clock.now(),
      toInstant(from, 0),
      toInstant(nextDay(to), 0),
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
