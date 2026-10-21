import {
  ForbiddenError,
  UseCase,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { SCHOOL_SETTINGS_ID, SchoolSettings } from "../model";
import { SchoolSettingsRepository } from "../provider";
import { SchoolSettingsActor } from "./school-settings-actor";
import { SchoolSettingsOut, toSchoolSettingsOut } from "./school-settings.out";

export interface SetWaitingListIn {
  actor: SchoolSettingsActor;
  enabled: unknown;
}

export class SetWaitingList implements UseCase<
  SetWaitingListIn,
  SchoolSettingsOut
> {
  constructor(
    private readonly schoolSettingsRepository: SchoolSettingsRepository,
  ) {}

  async execute(input: SetWaitingListIn): Promise<SchoolSettingsOut> {
    if (input.actor.status !== "approved") {
      throw new ForbiddenError("user.status.notApproved");
    }
    if (input.actor.role !== "admin") {
      throw new ForbiddenError("schoolSettings.role.notAdmin");
    }
    if (typeof input.enabled !== "boolean") {
      throw new ValidationException([
        new ValidationError("schoolSettings.waitingList.invalid"),
      ]);
    }

    const waitingListEnabled = input.enabled;
    const current = await this.schoolSettingsRepository.get();
    // The number stays as it is: a school may turn the switch before it ever sets a number.
    const settings = current
      ? current.clone({ waitingListEnabled })
      : new SchoolSettings({ id: SCHOOL_SETTINGS_ID, waitingListEnabled });
    await this.schoolSettingsRepository.save(settings);

    return toSchoolSettingsOut(settings);
  }
}
