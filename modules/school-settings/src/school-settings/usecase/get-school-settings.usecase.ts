import { UseCase } from "@rochas-surf-school/shared";
import { SchoolSettingsRepository } from "../provider";
import { SchoolSettingsActor } from "./school-settings-actor";
import { SchoolSettingsOut, toSchoolSettingsOut } from "./school-settings.out";

export interface GetSchoolSettingsIn {
  // Any status and role may read the settings: a denied or removed account still contacts the school.
  actor: SchoolSettingsActor;
}

export class GetSchoolSettings implements UseCase<
  GetSchoolSettingsIn,
  SchoolSettingsOut
> {
  constructor(
    private readonly schoolSettingsRepository: SchoolSettingsRepository,
  ) {}

  async execute(_input: GetSchoolSettingsIn): Promise<SchoolSettingsOut> {
    return toSchoolSettingsOut(await this.schoolSettingsRepository.get());
  }
}
