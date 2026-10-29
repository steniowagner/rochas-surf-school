import { AppIcon } from "@/modules/designs/components/app-icon";
import { DecisionCard } from "@/modules/designs/components/decision-card";
import { DenySheet } from "@/modules/designs/components/deny-sheet";
import { EmptyState } from "@/modules/designs/components/empty-state";
import { ErrorState } from "@/modules/designs/components/error-state";
import { PersonAvatar } from "@/modules/designs/components/person-avatar";
import { PersonSheet } from "@/modules/designs/components/person-sheet";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { RegistrationsSkeleton } from "@/modules/designs/components/registrations-skeleton";
import { ScreenIntro } from "@/modules/designs/components/screen-intro";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { registrationRequests } from "@/modules/designs/data/fortaleza";
import { appT } from "@/modules/designs/i18n/app-t";

import type { RegistrationsScreenProps } from "./registrations-screen.types";

// The app's `DENY_REASON_MAX_LENGTH`.
const DENY_REASON_MAX_LENGTH = 500;

/** "Entrar na escola": the new accounts waiting for approval, each with its e-mail, to approve or deny. */
export function RegistrationsScreen({ locale, state }: RegistrationsScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const listed = state === "ready" || state === "denySheet" || state === "personSheet";
  const overPhone = state === "denySheet" || state === "personSheet";
  const [first] = registrationRequests;

  return (
    <PhoneFrame tall={state === "ready"}>
      <div className={`flex flex-1 flex-col bg-page${overPhone ? " min-h-0" : ""}`}>
        <StackHeader title={listed ? "" : t("registrations.title")} />
        {listed ? (
          <div className={`flex flex-col gap-3 px-5 pb-8 pt-2${overPhone ? " min-h-0 flex-1 overflow-hidden" : ""}`}>
            <div className="mb-1">
              <ScreenIntro
                icon={<AppIcon name="Ionicons:person-add-outline" size={28} className="text-grape" />}
                eyebrow={t("registrations.waiting", { count: registrationRequests.length })}
                title={t("registrations.title")}
                description={t("registrations.description")}
              />
            </div>
            {registrationRequests.map((request) => (
              <DecisionCard
                key={request.id}
                pressable
                title={request.name}
                details={[request.email]}
                avatar={<PersonAvatar name={request.name} />}
                approveLabel={t("registrations.approve")}
                denyLabel={t("registrations.deny")}
              />
            ))}
          </div>
        ) : (
          <div className={`flex flex-1 flex-col px-5 pb-8 pt-2 ${state === "loading" ? "" : "justify-center"}`}>
            {state === "loading" ? <RegistrationsSkeleton locale={locale} /> : null}
            {state === "error" ? (
              <div className="flex">
                <ErrorState title={t("registrations.loadError.title")} description={t("registrations.loadError.description")} retryLabel={t("common.tryAgain")} />
              </div>
            ) : null}
            {state === "empty" ? (
              <div className="flex">
                <EmptyState icon="Ionicons:people-outline" title={t("registrations.empty.title")} description={t("registrations.empty.description")} />
              </div>
            ) : null}
          </div>
        )}
        {state === "denySheet" && first ? (
          <DenySheet
            title={t("registrations.denySheet.title")}
            hint={t("registrations.denySheet.hint", { name: first.name })}
            label={t("registrations.denySheet.label")}
            placeholder={t("registrations.denySheet.placeholder")}
            backLabel={t("registrations.denySheet.back")}
            confirmLabel={t("registrations.denySheet.confirm")}
            maxLength={DENY_REASON_MAX_LENGTH}
          />
        ) : null}
        {state === "personSheet" && first ? <PersonSheet locale={locale} name={first.name} role="student" whatsapp={null} email={first.email} /> : null}
      </div>
    </PhoneFrame>
  );
}
