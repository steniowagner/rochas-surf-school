import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { Button } from "../button";
import { PhoneNumberField } from "../phone-number-field";
import { ScreenIntro } from "../screen-intro";
import { Switch } from "../switch";

import type { SchoolSettingsFormProps } from "./school-settings-form.types";

/** The intro, the waiting-list switch and the school's WhatsApp number, then the Save button pinned to the bottom. */
export function SchoolSettingsForm({ locale, waitingListEnabled, whatsapp, canSave = false }: SchoolSettingsFormProps) {
  const t = (key: string) => appT(locale, key);

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 px-5 pb-6 pt-2">
        <ScreenIntro icon={<AppIcon name="Ionicons:settings-outline" size={30} className="text-grape" />} title={t("schoolSettings.title")} description={t("schoolSettings.description")} />
        <div className="flex flex-col gap-2">
          <p className="ds-text-section-label text-ink-2">{t("schoolSettings.waitingList.section")}</p>
          <div className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4">
            <div className="flex min-h-11 items-center gap-3">
              <p className="ds-text-list-title flex-1 text-ink">{t("schoolSettings.waitingList.label")}</p>
              <Switch value={waitingListEnabled} label={t("schoolSettings.waitingList.label")} />
            </div>
            <p className="ds-text-list-subtitle text-ink-2">{t(waitingListEnabled ? "schoolSettings.waitingList.on" : "schoolSettings.waitingList.off")}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="ds-text-section-label text-ink-2">{t("schoolSettings.whatsapp.section")}</p>
          <div className="flex flex-col gap-3.5 rounded-card border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              <AppIcon name="Ionicons:logo-whatsapp" size={19} className="text-ink-2" />
              <p className="ds-text-list-subtitle flex-1 text-ink-2">{t("schoolSettings.whatsapp.helper")}</p>
            </div>
            <PhoneNumberField country={whatsapp.country} dialCode={whatsapp.dialCode} value={whatsapp.number} />
          </div>
        </div>
      </div>
      <div className="bg-page px-5 pb-8 pt-3">
        <Button className="w-full" disabled={!canSave}>
          {t("schoolSettings.save")}
        </Button>
      </div>
    </>
  );
}
