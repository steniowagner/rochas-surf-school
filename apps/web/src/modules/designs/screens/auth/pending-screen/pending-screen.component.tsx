import { AppIcon } from "@/modules/designs/components/app-icon";
import { Button } from "@/modules/designs/components/button";
import { PendingStep } from "@/modules/designs/components/pending-step";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { ScreenIntro } from "@/modules/designs/components/screen-intro";
import { people } from "@/modules/designs/data/fortaleza";
import { appLocaleBySiteLocale } from "@/modules/designs/i18n/app-locale";
import { appRich, appT } from "@/modules/designs/i18n/app-t";

import type { PendingScreenProps } from "./pending-screen.types";

// The account was created on 9 September, as the mock calendar's week.
const createdAt = new Date("2026-09-09T12:00:00-03:00");

export function PendingScreen({ locale }: PendingScreenProps) {
  const t = (key: string) => appT(locale, key);
  const createdAtLabel = new Intl.DateTimeFormat(appLocaleBySiteLocale[locale], { day: "numeric", month: "short", timeZone: "America/Fortaleza" }).format(createdAt);

  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col justify-between bg-page px-5 pb-8.5 pt-3">
        <div className="mt-6 flex flex-col gap-6">
          <ScreenIntro
            icon={<AppIcon name="MaterialCommunityIcons:clock-outline" size={30} className="text-warn" />}
            iconTileClassName="bg-warn-tint"
            eyebrow={t("pending.eyebrow")}
            title={t("pending.title")}
            description={appRich(locale, "pending.description", { bold: (children) => <span className="font-extrabold text-ink">{children}</span> }, { email: people.email })}
          />
          <div className="rounded-card border border-line bg-surface px-4">
            <PendingStep state="done" title={t("pending.steps.created")} trailing={<span className="ds-text-list-subtitle text-ink-2">{createdAtLabel}</span>} />
            <div className="h-px bg-line" />
            <PendingStep
              state="current"
              title={t("pending.steps.approval")}
              trailing={<span className="ds-text-chip rounded-full bg-warn-tint px-2.5 py-1 text-warn">{t("pending.steps.inReview")}</span>}
            />
            <div className="h-px bg-line" />
            <PendingStep state="future" title={t("pending.steps.bookClasses")} />
          </div>
        </div>
        <Button variant="ghost">{t("pending.signOut")}</Button>
      </div>
    </PhoneFrame>
  );
}
