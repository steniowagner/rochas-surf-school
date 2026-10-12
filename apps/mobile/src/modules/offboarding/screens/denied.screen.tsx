import { Trans, useTranslation } from "react-i18next";
import { Text } from "react-native";

import { AccountStatus } from "@/components/account-status";
import { useSignOut } from "@/modules/auth/hooks/use-sign-out.hook";
import { useSession } from "@/providers/session";

import { ContactSchoolButton } from "../components/contact-school-button";

export function DeniedScreen() {
  const { t } = useTranslation();
  const { user } = useSession();
  const { signOut } = useSignOut();
  const reason = user?.denialReason ?? null;

  return (
    <AccountStatus
      tone="bad"
      icon="close"
      eyebrow={t("denied.eyebrow")}
      title={t("denied.title")}
      description={
        <Trans
          i18nKey="denied.description"
          t={t}
          values={{ email: user?.email ?? "" }}
          components={{ bold: <Text className="font-body-800 text-ink" /> }}
        />
      }
      // The reason is admin text: shown exactly as stored, and not at all when it is empty (D-05).
      note={
        reason?.trim()
          ? { title: t("denied.noteTitle"), text: reason }
          : undefined
      }
      primaryAction={<ContactSchoolButton />}
      onUseAnotherEmail={signOut}
    />
  );
}
