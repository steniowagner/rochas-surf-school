import { AppIcon } from "@/modules/designs/components/app-icon";
import { ChoiceRow } from "@/modules/designs/components/choice-row";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { ScreenIntro } from "@/modules/designs/components/screen-intro";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { TermsLine } from "@/modules/designs/components/terms-line";
import { appT } from "@/modules/designs/i18n/app-t";

import type { EmailChoiceScreenProps } from "./email-choice-screen.types";

export function EmailChoiceScreen({ locale }: EmailChoiceScreenProps) {
  const t = (key: string) => appT(locale, key);

  return (
    <PhoneFrame>
      <StackHeader title="" />
      <div className="flex flex-1 flex-col bg-page px-5 pb-8.5">
        <div className="mt-6 flex flex-col gap-6">
          <ScreenIntro
            icon={<AppIcon name="Ionicons:mail-outline" size={28} className="text-grape" />}
            title={t("emailChoice.title")}
            description={t("emailChoice.subtitle")}
          />
          <div className="flex flex-col gap-3">
            <ChoiceRow icon="Ionicons:log-in-outline" title={t("emailChoice.existing.title")} description={t("emailChoice.existing.description")} />
            <ChoiceRow icon="Ionicons:person-add-outline" title={t("emailChoice.new.title")} description={t("emailChoice.new.description")} />
          </div>
        </div>
        <div className="min-h-6 flex-1" />
        <TermsLine locale={locale} />
      </div>
    </PhoneFrame>
  );
}
