import { SchoolSettings } from "../model";

export interface SchoolSettingsOut {
  whatsappNumber: string | null;
}

export function toSchoolSettingsOut(
  settings: SchoolSettings | null,
): SchoolSettingsOut {
  return { whatsappNumber: settings?.whatsappNumber ?? null };
}
