import { AccountStatus } from "@/modules/designs/components/account-status";
import { ContactSchoolButton } from "@/modules/designs/components/contact-school-button";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { ScreenToast } from "@/modules/designs/components/screen-toast";
import { people } from "@/modules/designs/data/fortaleza";
import { appRich, appT } from "@/modules/designs/i18n/app-t";

import type { RemovedScreenProps } from "./removed-screen.types";

export function RemovedScreen({ locale, hasSchoolNumber = true, contactError = false }: RemovedScreenProps) {
  const t = (key: string) => appT(locale, key);

  return (
    <PhoneFrame>
      <AccountStatus
        tone="bad"
        icon="MaterialCommunityIcons:account-minus"
        eyebrow={t("removed.eyebrow")}
        title={t("removed.title")}
        description={appRich(locale, "removed.description", { bold: (children) => <span className="font-extrabold text-ink">{children}</span> }, { email: people.email })}
        note={{ title: t("removed.noteTitle"), text: t("removed.noteText") }}
        primaryAction={hasSchoolNumber ? <ContactSchoolButton label={t("closedAccount.contactSchool")} /> : undefined}
        useAnotherEmailLabel={t("closedAccount.useAnotherEmail")}
      />
      {contactError ? <ScreenToast message={t("closedAccount.whatsappUnavailable")} /> : null}
    </PhoneFrame>
  );
}
