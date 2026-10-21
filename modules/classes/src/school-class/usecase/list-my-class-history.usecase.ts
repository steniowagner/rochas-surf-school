import {
  UseCase,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { ClassActor } from "../../access";
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
  /** The raw query strings. */
  page?: unknown;
  perPage?: unknown;
}

export interface ListMyClassHistoryOut {
  items: ClassItem[];
  total: number;
  page: number;
  perPage: number;
}

export const MY_CLASS_HISTORY_DEFAULT_PER_PAGE = 20;
export const MY_CLASS_HISTORY_MAX_PER_PAGE = 50;

/** Digits only, between `min` and `max`; absent → `fallback`; anything else → `null`. */
function parseInteger(value: unknown, fallback: number, min: number, max: number): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);

  return parsed >= min && parsed <= max ? parsed : null;
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

    const errors: ValidationError[] = [];

    const page = parseInteger(input.page, 1, 1, Number.MAX_SAFE_INTEGER);
    if (page === null) errors.push(new ValidationError("class.page.invalid"));

    const perPage = parseInteger(
      input.perPage,
      MY_CLASS_HISTORY_DEFAULT_PER_PAGE,
      1,
      MY_CLASS_HISTORY_MAX_PER_PAGE,
    );
    if (perPage === null) errors.push(new ValidationError("class.perPage.invalid"));

    if (page === null || perPage === null) throw new ValidationException(errors);

    const { ids, total } = await this.myClassesReader.findHistoryClassIds(
      input.actor.id,
      this.clock.now(),
      page,
      perPage,
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
      total,
      page,
      perPage,
    };
  }
}
