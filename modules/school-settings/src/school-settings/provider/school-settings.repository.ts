import { SchoolSettings } from "../model";

export interface SchoolSettingsRepository {
  get(): Promise<SchoolSettings | null>;
  save(settings: SchoolSettings): Promise<void>;
}
