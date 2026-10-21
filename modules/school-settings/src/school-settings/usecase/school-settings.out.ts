import { SchoolSettings } from "../model";

export interface SchoolSettingsOut {
  whatsappNumber: string | null;
  waitingListEnabled: boolean;
}

export function toSchoolSettingsOut(
  settings: SchoolSettings | null,
): SchoolSettingsOut {
  return {
    whatsappNumber: settings?.whatsappNumber ?? null,
    waitingListEnabled: settings?.waitingListEnabled ?? true,
  };
}
