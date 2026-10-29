import { AppIcon } from "@/modules/designs/components/app-icon";
import { Button } from "@/modules/designs/components/button";
import { CancellationRulesSkeleton } from "@/modules/designs/components/cancellation-rules-skeleton";
import { ErrorState } from "@/modules/designs/components/error-state";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { ScreenIntro } from "@/modules/designs/components/screen-intro";
import { SegmentedControl } from "@/modules/designs/components/segmented-control";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { TextArea } from "@/modules/designs/components/text-area";
import { appT } from "@/modules/designs/i18n/app-t";

import type { CancellationRulesScreenProps } from "./cancellation-rules-screen.types";

// The app's `CANCELLATION_RULE_TEXT_MAX`.
const RULE_MAX = 2000;

/** "Regras de cancelamento": one rule per discipline, with the tips to write it so the app can read it. */
export function CancellationRulesScreen({ locale, state, surfRule }: CancellationRulesScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const ready = state === "surf" || state === "skateEmpty";
  const discipline = state === "skateEmpty" ? "skate" : "surf";

  return (
    <PhoneFrame tall={state === "surf"}>
      <div className="flex flex-1 flex-col bg-page">
        <StackHeader title={ready ? "" : t("cancellationRules.screen.title")} />
        {ready ? (
          <div className="flex flex-col gap-6 px-5 pb-8 pt-2">
            <ScreenIntro icon={<AppIcon name="Ionicons:document-text-outline" size={30} className="text-grape" />} title={t("cancellationRules.screen.title")} description={t("cancellationRules.screen.intro")} />
            <SegmentedControl
              options={[
                { value: "surf", label: t("newClass.discipline.surf") },
                { value: "skate", label: t("newClass.discipline.skate") },
              ]}
              value={discipline}
            />
            <div className="flex flex-col gap-3 rounded-card bg-dim p-4">
              <div className="flex items-start gap-3">
                <AppIcon name="Ionicons:time-outline" size={18} className="mt-0.5 shrink-0 text-lagoon" />
                <p className="ds-text-body flex-1 text-ink-2">{t("cancellationRules.screen.tipTime")}</p>
              </div>
              <div className="flex items-start gap-3">
                <AppIcon name="Ionicons:alert-circle-outline" size={18} className="mt-0.5 shrink-0 text-lagoon" />
                <p className="ds-text-body flex-1 text-ink-2">{t("cancellationRules.screen.tipAmbiguity")}</p>
              </div>
            </div>
            <TextArea value={discipline === "surf" ? surfRule : ""} maxLength={RULE_MAX} placeholder={t("cancellationRules.screen.placeholder")} />
            {/* Save waits for a change to the rule. */}
            <Button disabled>{t("cancellationRules.screen.save", { discipline: t(`cancellationRules.screen.discipline.${discipline}`) })}</Button>
          </div>
        ) : (
          <div className={`flex flex-1 flex-col px-5 pb-8 pt-2 ${state === "loading" ? "" : "justify-center"}`}>
            {state === "loading" ? (
              <CancellationRulesSkeleton locale={locale} />
            ) : (
              <div className="flex">
                <ErrorState title={t("cancellationRules.screen.loadError.title")} description={t("cancellationRules.screen.loadError.description")} retryLabel={t("common.tryAgain")} />
              </div>
            )}
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
