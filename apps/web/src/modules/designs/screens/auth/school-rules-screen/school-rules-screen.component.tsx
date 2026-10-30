import { AppIcon } from "@/modules/designs/components/app-icon";
import { Button } from "@/modules/designs/components/button";
import { Checkbox } from "@/modules/designs/components/checkbox";
import { EmptyState } from "@/modules/designs/components/empty-state";
import { ErrorState } from "@/modules/designs/components/error-state";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { SchoolRuleRow } from "@/modules/designs/components/school-rule-row";
import { SchoolRulesSkeleton } from "@/modules/designs/components/school-rules-skeleton";
import { ScreenIntro } from "@/modules/designs/components/screen-intro";
import { ScreenToast } from "@/modules/designs/components/screen-toast";
import { appT } from "@/modules/designs/i18n/app-t";

import type { SchoolRulesScreenProps } from "./school-rules-screen.types";

export function SchoolRulesScreen({ locale, state, variant = "onboarding", rules }: SchoolRulesScreenProps) {
  const t = (key: string) => appT(locale, key);
  const copy = variant === "rulesUpdate" ? "rulesUpdate" : "schoolRules";
  const ready = state === "loaded" || state === "accepted" || state === "outdated";
  const accepted = state === "accepted";

  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col bg-page">
        <div className="flex flex-1 flex-col gap-6 px-5 pb-6 pt-9">
          <ScreenIntro
            icon={<AppIcon name="Ionicons:shield-outline" size={30} className="text-grape" />}
            eyebrow={t(`${copy}.eyebrow`)}
            title={t(`${copy}.title`)}
            description={t(`${copy}.description`)}
          />
          {state === "loading" ? <SchoolRulesSkeleton locale={locale} /> : null}
          {state === "loadError" ? (
            <div className="flex flex-1">
              <ErrorState title={t("schoolRulesScreen.loadError.title")} description={t("schoolRulesScreen.loadError.description")} retryLabel={t("common.tryAgain")} />
            </div>
          ) : null}
          {state === "empty" ? (
            <div className="flex flex-1">
              <EmptyState icon="Ionicons:shield-outline" title={t("schoolRulesScreen.empty.title")} description={t("schoolRulesScreen.empty.description")} />
            </div>
          ) : null}
          {ready ? (
            <div className="rounded-card border border-line bg-surface px-4">
              {rules.map((rule, index) => <SchoolRuleRow key={rule.title} rule={rule} position={index + 1} showDivider={index < rules.length - 1} />)}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-3.5 border-t border-line bg-surface px-5 pb-8.5 pt-4">
          <Checkbox checked={accepted} label={t("schoolRules.accept")} disabled={!ready} />
          <Button disabled={!accepted}>{t(`${copy}.submit`)}</Button>
        </div>
      </div>
      {state === "outdated" ? <ScreenToast message={t("schoolRules.outdated")} /> : null}
    </PhoneFrame>
  );
}
