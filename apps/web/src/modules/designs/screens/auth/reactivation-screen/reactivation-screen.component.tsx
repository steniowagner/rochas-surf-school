import { AccountStatus } from "@/modules/designs/components/account-status";
import { Button } from "@/modules/designs/components/button";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { ScreenToast } from "@/modules/designs/components/screen-toast";
import { people } from "@/modules/designs/data/fortaleza";
import { appRich, appT } from "@/modules/designs/i18n/app-t";

import type { ReactivationScreenProps } from "./reactivation-screen.types";

export function ReactivationScreen({ locale, state, reason }: ReactivationScreenProps) {
  const t = (key: string) => appT(locale, key);
  const group = state === "requested" ? "requested" : state === "denied" || state === "deniedWithoutReason" ? "denied" : "notRequested";
  const description = appRich(locale, `reactivation.${group}.description`, { bold: (children) => <span className="font-extrabold text-ink">{children}</span> }, { email: people.email });
  const common = { eyebrow: t(`reactivation.${group}.eyebrow`), title: t(`reactivation.${group}.title`), description, useAnotherEmailLabel: t("closedAccount.useAnotherEmail") };

  return (
    <PhoneFrame>
      {group === "denied" ? (
        <AccountStatus
          tone="bad"
          icon="MaterialCommunityIcons:close-circle-outline"
          {...common}
          note={state === "denied" ? { title: t("reactivation.denied.noteTitle"), text: reason } : undefined}
        />
      ) : null}
      {group === "requested" ? (
        <AccountStatus
          tone="sand"
          icon="MaterialCommunityIcons:send-outline"
          {...common}
          note={{ title: t("reactivation.requested.noteTitle"), text: t("reactivation.requested.noteText") }}
        />
      ) : null}
      {group === "notRequested" ? (
        <AccountStatus
          tone="dim"
          icon="MaterialCommunityIcons:account-remove-outline"
          {...common}
          note={{ title: t("reactivation.notRequested.noteTitle"), text: t("reactivation.notRequested.noteText") }}
          primaryAction={<Button loading={state === "requesting"}>{t("reactivation.notRequested.request")}</Button>}
        />
      ) : null}
      {state === "error" ? <ScreenToast message={t("createAccount.errors.generic")} /> : null}
    </PhoneFrame>
  );
}
