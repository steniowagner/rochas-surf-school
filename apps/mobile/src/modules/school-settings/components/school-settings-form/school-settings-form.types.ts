import type { SchoolSettings } from "@/hooks/use-school-settings.types";
import type { useCollapsingTitleHeader } from "@/navigation/stack-header";

export type SchoolSettingsFormProps = {
  /** The saved settings the form starts from. */
  settings: SchoolSettings;
  /** The screen's collapsing header, driven by the scroll of the form. */
  header: ReturnType<typeof useCollapsingTitleHeader>;
};

export type UseSchoolSettingsFormProps = Pick<
  SchoolSettingsFormProps,
  "settings"
>;
