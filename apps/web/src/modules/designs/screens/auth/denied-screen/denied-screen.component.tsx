import { AccountStatus } from "@/modules/designs/components/account-status";
import { ContactSchoolButton } from "@/modules/designs/components/contact-school-button";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { people } from "@/modules/designs/data/fortaleza";
import { appRich, appT } from "@/modules/designs/i18n/app-t";

import type { DeniedScreenProps } from "./denied-screen.types";

export function DeniedScreen({ locale, reason, hasSchoolNumber = true }: DeniedScreenProps) {
  const t = (key: string) => appT(locale, key);

  return (
    <PhoneFrame>
      <AccountStatus
        tone="bad"
        icon="MaterialCommunityIcons:close"
        eyebrow={t("denied.eyebrow")}
        title={t("denied.title")}
        description={appRich(locale, "denied.description", { bold: (children) => <span className="font-extrabold text-ink">{children}</span> }, { email: people.email })}
        note={reason ? { title: t("denied.noteTitle"), text: reason } : undefined}
        primaryAction={hasSchoolNumber ? <ContactSchoolButton label={t("closedAccount.contactSchool")} /> : undefined}
        useAnotherEmailLabel={t("closedAccount.useAnotherEmail")}
      />
    </PhoneFrame>
  );
}
