import { useTranslation } from "react-i18next";

import { FlowPlaceholder } from "@/components/flow-placeholder";

export function DeniedScreen() {
  const { t } = useTranslation();

  return <FlowPlaceholder title={t("flows.offboardingDenied")} />;
}
