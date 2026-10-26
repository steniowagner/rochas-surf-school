import { useTranslation } from "react-i18next";

import { useSchoolRules } from "../../hooks/use-school-rules.hook";

import { UseSchoolRulesEntryRowProps } from "./school-rules-entry-row.types";

export const useSchoolRulesEntryRow = ({
  role,
}: UseSchoolRulesEntryRowProps) => {
  const { t } = useTranslation();
  const { data } = useSchoolRules();

  // No subtitle while the rules load or after they failed: the row still opens its screen.
  if (!data) {
    return { subtitle: null };
  }

  const count = data.rules.length;

  return {
    subtitle:
      count === 0
        ? t("schoolRulesEntryRow.empty")
        : t(`schoolRulesEntryRow.${role}Subtitle`, { count }),
  };
};
