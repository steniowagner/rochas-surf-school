import { TZDate, tz } from "@date-fns/tz";
import { format, startOfWeek, subWeeks } from "date-fns";
import { UseCase } from "@rochas-surf-school/shared";
import { ClassActor, assertCanManageClasses } from "../../access";
import { CLASS_TIME_ZONE, TimeRange } from "../model";
import { ClockProvider, SchoolClassRepository } from "../provider";

export interface ListTimeRangeSuggestionsIn {
  actor: ClassActor;
}

export interface ListTimeRangeSuggestionsOut {
  items: TimeRange[];
}

export class ListTimeRangeSuggestions
  implements UseCase<ListTimeRangeSuggestionsIn, ListTimeRangeSuggestionsOut>
{
  constructor(
    private readonly schoolClassRepository: SchoolClassRepository,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(
    input: ListTimeRangeSuggestionsIn,
  ): Promise<ListTimeRangeSuggestionsOut> {
    assertCanManageClasses(input.actor);

    const zone = tz(CLASS_TIME_ZONE);
    const now = new TZDate(this.clockProvider.now(), CLASS_TIME_ZONE);
    const thisMonday = startOfWeek(now, { weekStartsOn: 1, in: zone });
    const lastMonday = subWeeks(thisMonday, 1);
    const classes = await this.schoolClassRepository.findStartingBetween(
      new Date(lastMonday.getTime()),
      new Date(thisMonday.getTime()),
    );
    const ranges = new Map<string, TimeRange>();

    for (const item of classes) {
      const start = format(item.startsAt, "HH:mm", { in: zone });
      const end = format(item.endsAt, "HH:mm", { in: zone });
      ranges.set(`${start}-${end}`, { start, end });
    }

    return {
      items: [...ranges.values()].sort(
        (a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end),
      ),
    };
  }
}
