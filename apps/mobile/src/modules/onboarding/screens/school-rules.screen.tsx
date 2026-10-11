import { useTranslation } from "react-i18next";

import { SchoolRulesAcceptance } from "@/modules/school-rules/components/school-rules-acceptance";

export function SchoolRulesScreen() {
  const { t } = useTranslation();

  return (
    <SchoolRulesAcceptance
      eyebrow={t("schoolRules.eyebrow")}
      title={t("schoolRules.title")}
      description={t("schoolRules.description")}
      submitLabel={t("schoolRules.submit")}
    />
  );
}
