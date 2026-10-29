import { AppIcon } from "@/modules/designs/components/app-icon";
import { DecisionCard } from "@/modules/designs/components/decision-card";
import { DenySheet } from "@/modules/designs/components/deny-sheet";
import { EmptyState } from "@/modules/designs/components/empty-state";
import { ErrorState } from "@/modules/designs/components/error-state";
import { PersonAvatar } from "@/modules/designs/components/person-avatar";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { RegistrationsSkeleton } from "@/modules/designs/components/registrations-skeleton";
import { ScreenIntro } from "@/modules/designs/components/screen-intro";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { adminDates } from "@/modules/designs/data/admin-app";
import { reactivationRequests } from "@/modules/designs/data/fortaleza";
import { appT } from "@/modules/designs/i18n/app-t";

import type { ReactivationsScreenProps } from "./reactivations-screen.types";

// The app's `DENY_REASON_MAX_LENGTH`.
const DENY_REASON_MAX_LENGTH = 500;

/** "Reativar contas": the deleted accounts that asked to come back, with when they were deleted and their classes. */
export function ReactivationsScreen({ locale, state }: ReactivationsScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const dates = adminDates(locale);
  const listed = state === "ready" || state === "denySheet";
  const overPhone = state === "denySheet";
  const [first] = reactivationRequests;

  return (
    <PhoneFrame tall={state === "ready"}>
      <div className={`flex flex-1 flex-col bg-page${overPhone ? " min-h-0" : ""}`}>
        <StackHeader title={listed ? "" : t("reactivations.title")} />
        {listed ? (
          <div className={`flex flex-col gap-3 px-5 pb-8 pt-2${overPhone ? " min-h-0 flex-1 overflow-hidden" : ""}`}>
            <div className="mb-1">
              <ScreenIntro
                icon={<AppIcon name="Ionicons:refresh-outline" size={28} className="text-grape" />}
                eyebrow={t("reactivations.waiting", { count: reactivationRequests.length })}
                title={t("reactivations.title")}
                description={t("reactivations.description")}
              />
            </div>
            {reactivationRequests.map((request) => (
              <DecisionCard
                key={request.id}
                pressable
                title={request.name}
                details={[request.email, t("reactivations.details", { date: dates.longDate(request.deletedAt), count: request.classesTaken })]}
                avatar={<PersonAvatar name={request.name} />}
                approveLabel={t("reactivations.approve")}
                denyLabel={t("reactivations.deny")}
              />
            ))}
          </div>
        ) : (
          <div className={`flex flex-1 flex-col px-5 pb-8 pt-2 ${state === "loading" ? "" : "justify-center"}`}>
            {state === "loading" ? <RegistrationsSkeleton locale={locale} /> : null}
            {state === "error" ? (
              <div className="flex">
                <ErrorState title={t("reactivations.loadError.title")} description={t("reactivations.loadError.description")} retryLabel={t("common.tryAgain")} />
              </div>
            ) : null}
            {state === "empty" ? (
              <div className="flex">
                <EmptyState icon="Ionicons:people-outline" title={t("reactivations.empty.title")} description={t("reactivations.empty.description")} />
              </div>
            ) : null}
          </div>
        )}
        {state === "denySheet" && first ? (
          <DenySheet
            title={t("reactivations.denySheet.title")}
            hint={t("reactivations.denySheet.hint", { name: first.name })}
            label={t("reactivations.denySheet.label")}
            placeholder={t("reactivations.denySheet.placeholder")}
            backLabel={t("registrations.denySheet.back")}
            confirmLabel={t("reactivations.denySheet.confirm")}
            maxLength={DENY_REASON_MAX_LENGTH}
          />
        ) : null}
      </div>
    </PhoneFrame>
  );
}
