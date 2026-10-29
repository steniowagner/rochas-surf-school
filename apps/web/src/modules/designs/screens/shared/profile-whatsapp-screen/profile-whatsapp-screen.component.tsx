import { AppIcon } from "@/modules/designs/components/app-icon";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { ScreenIntro } from "@/modules/designs/components/screen-intro";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { WhatsappNumberForm } from "@/modules/designs/components/whatsapp-number-form";
import { appT } from "@/modules/designs/i18n/app-t";

import type { ProfileWhatsappScreenProps } from "./profile-whatsapp-screen.types";

/** The WhatsApp number and who can see it, as the profile edits them: "Salvar" waits for a change. */
export function ProfileWhatsappScreen({ locale, state }: ProfileWhatsappScreenProps) {
  const t = (key: string) => appT(locale, key);
  const invalid = state === "invalidNumber";

  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col bg-page">
        <StackHeader title="" />
        <div className="flex flex-1 flex-col px-5 pb-8.5">
          <WhatsappNumberForm
            header={<ScreenIntro icon={<AppIcon name="Ionicons:logo-whatsapp" size={28} className="text-grape" />} title={t("profileWhatsapp.title")} description={t("profileWhatsapp.description")} />}
            cardTitle={t("whatsapp.cardTitle")}
            helper={t("whatsapp.helper")}
            hideNumberLabel={t("whatsapp.hideNumber")}
            hideNumberHint={t("whatsapp.hideNumberHint")}
            hidden={false}
            country="BR"
            dialCode="+55"
            value={invalid ? "85 9123" : "85 99999-0000"}
            placeholder="85 91234-5678"
            status={invalid ? "error" : "neutral"}
            errorMessage={t("whatsapp.invalidNumber")}
            submitLabel={t("profileWhatsapp.save")}
            canSubmit={state === "saving"}
            saving={state === "saving"}
          />
        </div>
      </div>
    </PhoneFrame>
  );
}
