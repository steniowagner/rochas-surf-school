import {
  ForbiddenError,
  RequiredRule,
  UseCase,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { SCHOOL_SETTINGS_ID, SchoolSettings } from "../model";
import { SchoolSettingsRepository } from "../provider";
import { SchoolSettingsActor } from "./school-settings-actor";
import { SchoolSettingsOut, toSchoolSettingsOut } from "./school-settings.out";

export interface SetSchoolWhatsappIn {
  actor: SchoolSettingsActor;
  whatsappNumber: unknown;
}

export class SetSchoolWhatsapp implements UseCase<
  SetSchoolWhatsappIn,
  SchoolSettingsOut
> {
  constructor(
    private readonly schoolSettingsRepository: SchoolSettingsRepository,
  ) {}

  async execute(input: SetSchoolWhatsappIn): Promise<SchoolSettingsOut> {
    if (input.actor.status !== "approved") {
      throw new ForbiddenError("user.status.notApproved");
    }
    if (input.actor.role !== "admin") {
      throw new ForbiddenError("schoolSettings.role.notAdmin");
    }
    // PhoneNumberRule checks each item of a list, so only a string may reach the entity.
    const present = new RequiredRule().validate(input.whatsappNumber) === null;
    if (present && typeof input.whatsappNumber !== "string") {
      throw new ValidationException([
        new ValidationError("schoolSettings.whatsappNumber.phone"),
      ]);
    }

    const whatsappNumber = input.whatsappNumber as string | undefined;
    const current = await this.schoolSettingsRepository.get();
    const settings = current
      ? current.clone({ whatsappNumber })
      : new SchoolSettings({ id: SCHOOL_SETTINGS_ID, whatsappNumber });
    settings.validate();
    await this.schoolSettingsRepository.save(settings);

    return toSchoolSettingsOut(settings);
  }
}
