import { AppIcon } from "@/modules/designs/components/app-icon";
import { EmptyState } from "@/modules/designs/components/empty-state";
import { ErrorState } from "@/modules/designs/components/error-state";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { RemovedAccountRow } from "@/modules/designs/components/removed-account-row";
import { RemovedAccountsSkeleton } from "@/modules/designs/components/removed-accounts-skeleton";
import { ScreenIntro } from "@/modules/designs/components/screen-intro";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { adminDates } from "@/modules/designs/data/admin-app";
import { removedAccounts } from "@/modules/designs/data/fortaleza";
import { appT } from "@/modules/designs/i18n/app-t";

import type { RemovedAccountsScreenProps } from "./removed-accounts-screen.types";

/** "Contas removidas": the accounts removed in the last 30 days, each with the day it goes for good and Restore. */
export function RemovedAccountsScreen({ locale, state }: RemovedAccountsScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const dates = adminDates(locale);

  return (
    <PhoneFrame tall={state === "ready"}>
      <div className="flex flex-1 flex-col bg-page">
        <StackHeader title={state === "ready" ? "" : t("removedAccounts.title")} />
        {state === "ready" ? (
          <div className="flex flex-col gap-3 px-5 pb-8 pt-2">
            <div className="mb-1">
              <ScreenIntro
                icon={<AppIcon name="MaterialCommunityIcons:account-off-outline" size={28} className="text-grape" />}
                eyebrow={t("removedAccounts.count", { count: removedAccounts.length })}
                title={t("removedAccounts.title")}
                description={t("removedAccounts.description")}
              />
            </div>
            {removedAccounts.map((account) => (
              <RemovedAccountRow key={account.id} locale={locale} name={account.name} role={account.role} removedOn={dates.removalDay(account.removedAt)} deletedOn={dates.removalDay(dates.deletedOn(account.removedAt))} />
            ))}
          </div>
        ) : (
          <div className={`flex flex-1 flex-col px-5 pb-8 pt-2 ${state === "loading" ? "" : "justify-center"}`}>
            {state === "loading" ? <RemovedAccountsSkeleton locale={locale} /> : null}
            {state === "error" ? (
              <div className="flex">
                <ErrorState title={t("removedAccounts.loadError.title")} description={t("removedAccounts.loadError.description")} retryLabel={t("common.tryAgain")} />
              </div>
            ) : null}
            {state === "empty" ? (
              <div className="flex">
                <EmptyState icon="Ionicons:refresh-circle-outline" title={t("removedAccounts.empty.title")} description={t("removedAccounts.empty.description")} />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
