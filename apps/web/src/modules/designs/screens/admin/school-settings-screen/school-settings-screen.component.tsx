import { ErrorState } from "@/modules/designs/components/error-state";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { SchoolSettingsForm } from "@/modules/designs/components/school-settings-form";
import { SchoolSettingsSkeleton } from "@/modules/designs/components/school-settings-skeleton";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { appT } from "@/modules/designs/i18n/app-t";

import type { SchoolSettingsScreenProps } from "./school-settings-screen.types";

// The school's WhatsApp number, after the dial code.
const SCHOOL_WHATSAPP = { country: "🇧🇷", dialCode: "+55", number: "85 3219 4400" };

/** "Configurações da escola": the waiting list of the full classes and the school's WhatsApp, saved together. */
export function SchoolSettingsScreen({ locale, state }: SchoolSettingsScreenProps) {
  const t = (key: string) => appT(locale, key);
  const ready = state === "ready" || state === "waitingListOff";

  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col bg-page">
        <StackHeader title={ready ? "" : t("schoolSettings.title")} />
        {ready ? (
          // The switch turned off is a change, so Save is ready for it.
          <SchoolSettingsForm locale={locale} waitingListEnabled={state === "ready"} whatsapp={SCHOOL_WHATSAPP} canSave={state === "waitingListOff"} />
        ) : (
          <div className={`flex flex-1 flex-col px-5 pb-8 pt-2 ${state === "error" ? "justify-center" : ""}`}>
            {state === "error" ? (
              <div className="flex">
                <ErrorState title={t("schoolSettings.loadError.title")} description={t("schoolSettings.loadError.description")} retryLabel={t("common.tryAgain")} />
              </div>
            ) : (
              <SchoolSettingsSkeleton locale={locale} />
            )}
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
