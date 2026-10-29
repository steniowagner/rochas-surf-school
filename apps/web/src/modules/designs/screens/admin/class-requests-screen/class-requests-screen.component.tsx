import { AppIcon } from "@/modules/designs/components/app-icon";
import { ClassRequestsGroup } from "@/modules/designs/components/class-requests-group";
import { ClassRequestsSkeleton } from "@/modules/designs/components/class-requests-skeleton";
import { DenySheet } from "@/modules/designs/components/deny-sheet";
import { DisciplineFilter } from "@/modules/designs/components/discipline-filter";
import { EmptyState } from "@/modules/designs/components/empty-state";
import { ErrorState } from "@/modules/designs/components/error-state";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { ScreenIntro } from "@/modules/designs/components/screen-intro";
import { ScreenToast } from "@/modules/designs/components/screen-toast";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { adminDates } from "@/modules/designs/data/admin-app";
import { pendingRequestGroups } from "@/modules/designs/data/fortaleza";
import { appT } from "@/modules/designs/i18n/app-t";

import type { ClassRequestsScreenProps } from "./class-requests-screen.types";

// The app's `DENY_REASON_MAX_LENGTH`.
const DENY_REASON_MAX_LENGTH = 500;

/** "Inscrições em aulas": the pending requests grouped by class, to enrol or deny, with the sport filter over them. */
export function ClassRequestsScreen({ locale, state }: ClassRequestsScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const dates = adminDates(locale);
  const listed = state !== "empty" && state !== "loading" && state !== "error";
  // The empty filter is drawn when only the skate class waits; the full class's group is seen scrolled to.
  const groups = state === "emptyFiltered" ? pendingRequestGroups.filter((group) => group.discipline === "skate") : pendingRequestGroups;
  const shown = state === "filtered" ? groups.filter((group) => group.discipline === "surf") : state === "emptyFiltered" ? [] : state === "fullClass" ? groups.filter((group) => group.seatsTaken >= group.capacity) : groups;
  const total = groups.reduce((sum, group) => sum + group.requests.length, 0);
  const overPhone = state === "denySheet" || state === "approved";
  const discipline = state === "filtered" || state === "emptyFiltered" ? "surf" : "all";

  return (
    <PhoneFrame tall={state === "ready"}>
      <div className={`flex flex-1 flex-col bg-page${overPhone ? " min-h-0" : ""}`}>
        {/* The title collapses into the header once the intro scrolls away, and stays there in the states that don't scroll. */}
        <StackHeader title={listed && state !== "fullClass" ? "" : t("classRequests.title")} />
        {listed ? (
          <div className={`flex flex-col gap-6 px-5 pb-28 pt-2${overPhone ? " min-h-0 flex-1 overflow-hidden" : ""}`}>
            {state === "fullClass" ? null : (
              <ScreenIntro
                icon={<AppIcon name="Ionicons:people-outline" size={28} className="text-grape" />}
                eyebrow={`${t("classRequests.requestsCount", { count: total })} · ${t("classRequests.classesCount", { count: groups.length })}`}
                title={t("classRequests.title")}
                description={t("classRequests.description")}
              />
            )}
            {shown.map((group) => (
              <ClassRequestsGroup
                key={group.id}
                locale={locale}
                discipline={group.discipline}
                level={group.level}
                block={dates.dayBlock(group.date)}
                timeRange={group.timeRange}
                locationName={group.locationName}
                seatsTaken={group.seatsTaken}
                capacity={group.capacity}
                requests={group.requests.map((request) => ({ ...request, askedAt: { time: request.askedAt.time, date: dates.shortDay(request.askedAt.date) } }))}
              />
            ))}
            {state === "emptyFiltered" ? (
              <div className="flex">
                <EmptyState icon="Ionicons:checkmark-done-outline" title={t("classRequests.emptyFiltered.surf.title")} description={t("classRequests.emptyFiltered.surf.description")} />
              </div>
            ) : null}
          </div>
        ) : (
          <div className={`flex flex-1 flex-col px-5 pb-8 pt-2 ${state === "loading" ? "" : "justify-center"}`}>
            {state === "loading" ? <ClassRequestsSkeleton locale={locale} /> : null}
            {state === "error" ? (
              <div className="flex">
                <ErrorState title={t("classRequests.loadError.title")} description={t("classRequests.loadError.description")} retryLabel={t("common.tryAgain")} />
              </div>
            ) : null}
            {state === "empty" ? (
              <div className="flex">
                <EmptyState icon="Ionicons:checkmark-done-outline" title={t("classRequests.empty.title")} description={t("classRequests.empty.description")} />
              </div>
            ) : null}
          </div>
        )}
        <DisciplineFilter locale={locale} value={discipline} />
        {state === "denySheet" ? (
          <DenySheet
            title={t("classRequests.denySheet.title")}
            hint={t("classRequests.denySheet.hint", { name: "Gabriel Moura" })}
            label={t("classRequests.denySheet.label")}
            placeholder={t("classRequests.denySheet.placeholder")}
            backLabel={t("classRequests.denySheet.back")}
            confirmLabel={t("classRequests.denySheet.confirm")}
            maxLength={DENY_REASON_MAX_LENGTH}
          />
        ) : null}
        {state === "approved" ? <ScreenToast message={t("classRequests.approved", { name: "Gabriel Moura" })} tone="success" /> : null}
      </div>
    </PhoneFrame>
  );
}
