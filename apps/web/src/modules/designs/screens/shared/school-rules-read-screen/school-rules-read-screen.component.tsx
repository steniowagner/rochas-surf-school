import { AppIcon } from "@/modules/designs/components/app-icon";
import { EmptyState } from "@/modules/designs/components/empty-state";
import { ErrorState } from "@/modules/designs/components/error-state";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { SchoolRuleRow } from "@/modules/designs/components/school-rule-row";
import { SchoolRulesSkeleton } from "@/modules/designs/components/school-rules-skeleton";
import { ScreenIntro } from "@/modules/designs/components/screen-intro";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { appT } from "@/modules/designs/i18n/app-t";

import type { SchoolRulesReadScreenProps } from "./school-rules-read-screen.types";

/** The school rules to read at any time: no checkbox and no button, only the back button. */
export function SchoolRulesReadScreen({ locale, state, rules }: SchoolRulesReadScreenProps) {
  const t = (key: string) => appT(locale, key);

  return (
    <PhoneFrame tall={state === "ready"}>
      <div className="flex flex-1 flex-col bg-page">
        <StackHeader title={state === "ready" ? "" : t("schoolRulesScreen.title")} />
        {state === "ready" ? (
          <div className="flex flex-col gap-4 px-5 pb-10 pt-2">
            <ScreenIntro icon={<AppIcon name="Ionicons:shield-outline" size={28} className="text-grape" />} title={t("schoolRulesScreen.title")} description={t("schoolRulesScreen.description")} />
            <div className="rounded-card border border-line bg-surface px-4">
              {rules.map((rule, index) => (
                <SchoolRuleRow key={rule.title} rule={rule} position={index + 1} showDivider={index < rules.length - 1} />
              ))}
            </div>
          </div>
        ) : (
          <div className={`flex flex-1 flex-col px-5 pb-8 pt-2 ${state === "loading" ? "" : "justify-center"}`}>
            {state === "loading" ? (
              <SchoolRulesSkeleton locale={locale} />
            ) : state === "error" ? (
              <div className="flex">
                <ErrorState title={t("schoolRulesScreen.loadError.title")} description={t("schoolRulesScreen.loadError.description")} retryLabel={t("common.tryAgain")} />
              </div>
            ) : (
              <div className="flex">
                <EmptyState icon="Ionicons:shield-outline" title={t("schoolRulesScreen.empty.title")} description={t("schoolRulesScreen.empty.description")} />
              </div>
            )}
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
