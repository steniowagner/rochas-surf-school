import { useTranslation } from "react-i18next";

import { FlowPlaceholder } from "@/components/flow-placeholder";

export function StudentScreen() {
  const { t } = useTranslation();

  return <FlowPlaceholder title={t("flows.student")} />;
}
