import { TZDate, tz } from "@date-fns/tz";
import { addWeeks, format, startOfWeek } from "date-fns";
import {
  UseCase,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { ClassActor, assertCanReadClasses } from "../../access";
import { CLASS_TIME_ZONE, isValidIsoDate } from "../model";
import { ClassViewReader } from "../provider";
import { ClassItem, toClassItem } from "./class-item";

export interface ListWeekClassesIn {
  actor: ClassActor;
  /** Any `YYYY-MM-DD` day of the wanted week. */
  date: unknown;
}

export interface ListWeekClassesOut {
  weekStart: string;
  items: ClassItem[];
}

export class ListWeekClasses
  implements UseCase<ListWeekClassesIn, ListWeekClassesOut>
{
  constructor(private readonly classViewReader: ClassViewReader) {}

  async execute(input: ListWeekClassesIn): Promise<ListWeekClassesOut> {
    assertCanReadClasses(input.actor);

    if (!isValidIsoDate(input.date)) {
      throw new ValidationException([new ValidationError("class.date.invalid")]);
    }

    const zone = tz(CLASS_TIME_ZONE);
    const [year, month, day] = input.date.split("-").map(Number) as [number, number, number];
    const monday = startOfWeek(new TZDate(year, month - 1, day, CLASS_TIME_ZONE), {
      weekStartsOn: 1,
      in: zone,
    });
    const nextMonday = addWeeks(monday, 1);
    const views = await this.classViewReader.findStartingBetween(
      new Date(monday.getTime()),
      new Date(nextMonday.getTime()),
    );

    return {
      weekStart: format(monday, "yyyy-MM-dd", { in: zone }),
      items: [...views]
        .sort(
          (a, b) =>
            a.startsAt.getTime() - b.startsAt.getTime() ||
            a.endsAt.getTime() - b.endsAt.getTime() ||
            a.id.localeCompare(b.id),
        )
        .map(toClassItem),
    };
  }
}
