import { useTranslation } from "react-i18next";

import { FlowPlaceholder } from "@/components/flow-placeholder";

export default function ProfileRoute() {
  const { t } = useTranslation();

  return <FlowPlaceholder title={t("tabs.profile")} />;
}
