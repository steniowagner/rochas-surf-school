import { Trans, useTranslation } from "react-i18next";
import { Text } from "react-native";

import { AccountStatus } from "@/components/account-status";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/modules/auth/hooks/use-sign-out.hook";
import { useSession } from "@/providers/session";

import { useRequestReactivation } from "../hooks/use-request-reactivation.hook";

export function ReactivationScreen() {
  const { t } = useTranslation();
  const { user } = useSession();
  const { signOut } = useSignOut();
  const { mutate, isPending } = useRequestReactivation();
  const status = user?.reactivationStatus ?? null;

  // The state is the session's `reactivationStatus` (D-02): a request or a refusal changes it in place.
  const state =
    status === "requested"
      ? "requested"
      : status === "denied"
        ? "denied"
        : "notRequested";

  const description = (
    <Trans
      i18nKey={`reactivation.${state}.description`}
      t={t}
      values={{ email: user?.email ?? "" }}
      components={{ bold: <Text className="font-body-800 text-ink" /> }}
    />
  );

  if (state === "denied") {
    return (
      <AccountStatus
        tone="bad"
        icon="close-circle-outline"
        eyebrow={t("reactivation.denied.eyebrow")}
        title={t("reactivation.denied.title")}
        description={description}
        onUseAnotherEmail={signOut}
      />
    );
  }

  if (state === "requested") {
    return (
      <AccountStatus
        tone="sand"
        icon="send-outline"
        eyebrow={t("reactivation.requested.eyebrow")}
        title={t("reactivation.requested.title")}
        description={description}
        note={{
          title: t("reactivation.requested.noteTitle"),
          text: t("reactivation.requested.noteText"),
        }}
        onUseAnotherEmail={signOut}
      />
    );
  }

  return (
    <AccountStatus
      tone="dim"
      icon="account-remove-outline"
      eyebrow={t("reactivation.notRequested.eyebrow")}
      title={t("reactivation.notRequested.title")}
      description={description}
      note={{
        title: t("reactivation.notRequested.noteTitle"),
        text: t("reactivation.notRequested.noteText"),
      }}
      primaryAction={
        <Button loading={isPending} onPress={() => mutate()}>
          {t("reactivation.notRequested.request")}
        </Button>
      }
      onUseAnotherEmail={signOut}
    />
  );
}
