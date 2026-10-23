import { UseCase } from "@rochas-surf-school/shared";
import { LocationRepository } from "../../location";
import { CLASS_REMINDER_LEAD_MINUTES, SchoolClass } from "../model";
import {
  ClassReminderNotifier,
  ClassRosterReader,
  ClockProvider,
  SchoolClassRepository,
} from "../provider";

export interface SendClassRemindersOut {
  reminded: number;
}

export class SendClassReminders implements UseCase<void, SendClassRemindersOut> {
  constructor(
    private readonly schoolClassRepository: SchoolClassRepository,
    private readonly classRosterReader: ClassRosterReader,
    private readonly locationRepository: LocationRepository,
    private readonly classReminderNotifier: ClassReminderNotifier,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(): Promise<SendClassRemindersOut> {
    const now = this.clockProvider.now();
    const due = await this.schoolClassRepository.findDueForReminder(now, CLASS_REMINDER_LEAD_MINUTES);

    if (due.length === 0) {
      return { reminded: 0 };
    }

    const rosters = await this.classRosterReader.findRosters(due.map((item) => item.id));
    const locationNames = new Map<string, string | null>();
    let reminded = 0;

    for (const schoolClass of due) {
      const locationName = await this.findLocationName(schoolClass.locationId, locationNames);

      // Without its place the reminder can't be written; the class stays due.
      if (locationName === null) continue;

      if (!(await this.schoolClassRepository.markReminded(schoolClass.id, now))) continue;

      reminded += 1;

      const studentIds = (rosters.get(schoolClass.id)?.students ?? []).map((student) => student.id);
      await this.notify(schoolClass, [...new Set([...studentIds, ...schoolClass.instructorIds])], locationName);
    }

    return { reminded };
  }

  private async findLocationName(id: string, names: Map<string, string | null>): Promise<string | null> {
    if (!names.has(id)) {
      names.set(id, (await this.locationRepository.findById(id))?.name ?? null);
    }

    return names.get(id)!;
  }

  /** A failed notification never undoes the mark; the adapter logs it. */
  private async notify(schoolClass: SchoolClass, recipientIds: string[], locationName: string): Promise<void> {
    if (recipientIds.length === 0) return;

    try {
      await this.classReminderNotifier.classReminder({
        recipientIds,
        classId: schoolClass.id,
        discipline: schoolClass.discipline,
        startsAt: schoolClass.startsAt,
        locationName,
      });
    } catch {
      // swallowed on purpose
    }
  }
}
