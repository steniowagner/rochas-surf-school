import type { SchoolSettings } from "@/hooks/use-school-settings.types";

export type SchoolSettingsFormProps = {
  /** The saved settings the form starts from. */
  settings: SchoolSettings;
};

export type UseSchoolSettingsFormProps = SchoolSettingsFormProps;
