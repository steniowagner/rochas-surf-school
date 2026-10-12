import { Trans, useTranslation } from "react-i18next";
import { Text } from "react-native";

import { AccountStatus } from "@/components/account-status";
import { useSignOut } from "@/modules/auth/hooks/use-sign-out.hook";
import { useSession } from "@/providers/session";

import { ContactSchoolButton } from "../components/contact-school-button";

export function RemovedScreen() {
  const { t } = useTranslation();
  const { user } = useSession();
  const { signOut } = useSignOut();

  return (
    <AccountStatus
      tone="bad"
      icon="account-minus"
      eyebrow={t("removed.eyebrow")}
      title={t("removed.title")}
      description={
        <Trans
          i18nKey="removed.description"
          t={t}
          values={{ email: user?.email ?? "" }}
          components={{ bold: <Text className="font-body-800 text-ink" /> }}
        />
      }
      note={{ title: t("removed.noteTitle"), text: t("removed.noteText") }}
      primaryAction={<ContactSchoolButton />}
      onUseAnotherEmail={signOut}
    />
  );
}
