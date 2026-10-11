import { useTranslation } from "react-i18next";

import { FlowPlaceholder } from "@/components/flow-placeholder";

// The second onboarding step: the school-rules spec builds the real screen.
export function SchoolRulesScreen() {
  const { t } = useTranslation();

  return <FlowPlaceholder title={t("flows.schoolRules")} />;
}
