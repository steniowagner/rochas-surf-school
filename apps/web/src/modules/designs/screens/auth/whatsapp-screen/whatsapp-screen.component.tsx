import { AppIcon } from "@/modules/designs/components/app-icon";
import { CountryPicker } from "@/modules/designs/components/country-picker";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { ScreenIntro } from "@/modules/designs/components/screen-intro";
import { ScreenToast } from "@/modules/designs/components/screen-toast";
import { WhatsappNumberForm } from "@/modules/designs/components/whatsapp-number-form";
import { countries, people } from "@/modules/designs/data/fortaleza";
import { appT } from "@/modules/designs/i18n/app-t";

import type { WhatsappScreenProps } from "./whatsapp-screen.types";

export function WhatsappScreen({ locale, state }: WhatsappScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const invalid = state === "invalid";
  const filled = state === "filled" || state === "saving" || state === "saveError";

  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col bg-page px-5 pb-8.5 pt-3">
        <WhatsappNumberForm
          header={
            <ScreenIntro
              icon={<AppIcon name="Ionicons:checkmark" size={30} className="text-ok" />}
              iconTileClassName="bg-ok-tint"
              eyebrow={t("whatsapp.eyebrow")}
              eyebrowClassName="text-ok"
              title={t("whatsapp.title", { firstName: people.firstName })}
              description={t("whatsapp.description")}
            />
          }
          cardTitle={t("whatsapp.cardTitle")}
          helper={t("whatsapp.helper")}
          hideNumberLabel={t("whatsapp.hideNumber")}
          hideNumberHint={t("whatsapp.hideNumberHint")}
          // The app starts with the number hidden, so the switch is on until the person turns it off.
          hidden
          country="BR"
          dialCode="+55"
          value={filled ? "85 98765-4321" : invalid ? "85 9123" : ""}
          placeholder="85 91234-5678"
          status={invalid ? "error" : "neutral"}
          errorMessage={t("whatsapp.invalidNumber")}
          submitLabel={t("whatsapp.submit")}
          canSubmit={filled}
          saving={state === "saving"}
        />
      </div>
      {state === "countryPicker" ? <CountryPicker title={t("whatsapp.pickerTitle")} searchPlaceholder={t("whatsapp.pickerSearch")} countries={countries} /> : null}
      {state === "saveError" ? <ScreenToast message={t("createAccount.errors.noConnection")} /> : null}
    </PhoneFrame>
  );
}
