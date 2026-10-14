import { useTranslation } from "react-i18next";

import { FlowPlaceholder } from "@/components/flow-placeholder";

export default function ClassesRoute() {
  const { t } = useTranslation();

  return <FlowPlaceholder title={t("tabs.classes")} />;
}
