import { SchoolSettings, SchoolSettingsRepository } from "../../src";

export class FakeSchoolSettingsRepository implements SchoolSettingsRepository {
  readonly saved: SchoolSettings[] = [];
  private settings: SchoolSettings | null;

  constructor(settings: SchoolSettings | null = null) {
    this.settings = settings;
  }

  async get(): Promise<SchoolSettings | null> {
    return this.settings;
  }

  async save(settings: SchoolSettings): Promise<void> {
    this.settings = settings;
    this.saved.push(settings);
  }
}
