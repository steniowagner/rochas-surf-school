import { useTranslation } from "react-i18next";

import { SchoolRulesAcceptance } from "@/modules/school-rules/components/school-rules-acceptance";

/** The only screen of the rules-update flow: the updated school rules, with no way out but accepting them (spec 013, D-05). */
export function RulesUpdateScreen() {
  const { t } = useTranslation();

  return (
    <SchoolRulesAcceptance
      eyebrow={t("rulesUpdate.eyebrow")}
      title={t("rulesUpdate.title")}
      description={t("rulesUpdate.description")}
      submitLabel={t("rulesUpdate.submit")}
    />
  );
}
