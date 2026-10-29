import { AppIcon } from "@/modules/designs/components/app-icon";
import { Button } from "@/modules/designs/components/button";
import { Chip } from "@/modules/designs/components/chip";
import { ClassDetailsSkeleton } from "@/modules/designs/components/class-details-skeleton";
import { ClassFullBanner } from "@/modules/designs/components/class-full-banner";
import { ClassInfoCard } from "@/modules/designs/components/class-info-card";
import { ClassLocationCard } from "@/modules/designs/components/class-location-card";
import { ClassPeople } from "@/modules/designs/components/class-people";
import { ClassRuleRow } from "@/modules/designs/components/class-rule-row";
import { ContactSchoolButton } from "@/modules/designs/components/contact-school-button";
import { CancelSeatSheet } from "@/modules/designs/components/cancel-seat-sheet";
import { DenialReasonSheet } from "@/modules/designs/components/denial-reason-sheet";
import { EmptyState } from "@/modules/designs/components/empty-state";
import { EnrolmentBanner } from "@/modules/designs/components/enrolment-banner";
import { ErrorState } from "@/modules/designs/components/error-state";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { RequestSeatSheet } from "@/modules/designs/components/request-seat-sheet";
import { ScreenToast } from "@/modules/designs/components/screen-toast";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { WithdrawRequestSheet } from "@/modules/designs/components/withdraw-request-sheet";
import { students } from "@/modules/designs/data/fortaleza";
import { studentDates } from "@/modules/designs/data/student-app";
import { appT } from "@/modules/designs/i18n/app-t";

import { getEnrolmentCta, scenarios } from "./class-details-screen.constants";
import type { ClassDetailsScreenProps } from "./class-details-screen.types";

const instructor = { id: "rafael", name: "Rafael Rocha" };

/** The student's class details: the class, the enrolment banner, the people, the rules, the notes, the place and the footer button. */
export function ClassDetailsScreen({ locale, state, sheet, toast, texts, withoutReason = false }: ClassDetailsScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const dates = studentDates(locale);

  if (state === "loading" || state === "notFound" || state === "error") {
    return (
      <PhoneFrame>
        <div className="flex flex-1 flex-col bg-page">
          <StackHeader title="" />
          <div className="flex flex-1 flex-col px-5 pb-8 pt-4">
            {state === "loading" ? (
              <div role="status" aria-label={t("classDetails.loading")}>
                <ClassDetailsSkeleton />
              </div>
            ) : state === "notFound" ? (
              <EmptyState icon="Ionicons:search" title={t("classDetails.notFoundState.title")} description={t("classDetails.notFoundState.description")} />
            ) : (
              <ErrorState title={t("classDetails.errorState.title")} description={t("classDetails.errorState.description")} retryLabel={t("common.tryAgain")} />
            )}
          </div>
        </div>
      </PhoneFrame>
    );
  }

  const scenario = scenarios[state];
  const cta = scenario.classState === "not-started" ? getEnrolmentCta(scenario.status, scenario.full, scenario.canCancel, scenario.waitingListEnabled) : null;
  const deadline = scenario.deadline === "ahead" ? dates.deadlineAhead : dates.deadlinePassed;
  const deadlineNote = scenario.classState === "not-started" && scenario.status === "approved" && !scenario.canCancel ? (scenario.deadline === "none" ? "missing" : "passed") : null;
  const bannerStatus = scenario.status === "pending" && scenario.full ? "waitingList" : scenario.status;
  const showFullBanner = scenario.classState === "not-started" && scenario.full && scenario.status === null;
  const seatsTaken = scenario.full ? 8 : scenario.classState === "finished" ? 5 : 4;
  const people = scenario.inClass ? students.slice(0, 4) : students.slice(1, 5);
  const classCard = { discipline: "surf", level: "beginner", weekday: dates.weekdayLabel, date: dates.dayLabel, duration: `1 h 30 min`, timeRange: "08:00 – 09:30", locationName: "Praia de Iracema" } as const;
  const showRules = scenario.classState !== "cancelled";

  return (
    <PhoneFrame tall>
      <div className="flex flex-1 flex-col bg-page">
        <StackHeader title="" />
        <div className="flex flex-col gap-6 px-5 pb-6 pt-4">
          <div className="flex flex-col gap-2">
            <div className="mb-1 flex flex-wrap gap-2">
              <Chip tone="surf">{t("newClass.discipline.surf")}</Chip>
              <Chip tone="info">{t("newClass.level.beginner")}</Chip>
            </div>
            <p className="ds-text-list-title text-ink-2">{dates.dateLine}</p>
            <p className="ds-text-kpi text-ink">08:00 – 09:30</p>
          </div>
          {scenario.classState === "started" ? <ClassInfoCard locale={locale} variant="started" start="08:00" end="09:30" /> : null}
          {scenario.classState === "cancelled" ? <ClassInfoCard locale={locale} variant="cancelled" /> : null}
          {showFullBanner ? <ClassFullBanner locale={locale} waitingList={scenario.waitingListEnabled ? "open" : "closed"} /> : null}
          {bannerStatus ? <EnrolmentBanner locale={locale} status={bannerStatus} reason={texts.takeOutReason} pressable={bannerStatus === "denied"} /> : null}
          {scenario.classState === "finished" ? <ClassInfoCard locale={locale} variant="finished" end="09:30" /> : null}
          <ClassPeople
            locale={locale}
            instructors={scenario.noInstructor ? [] : [instructor]}
            students={people.map((student) => ({ ...student }))}
            seatsTaken={seatsTaken}
            capacity={8}
            state={scenario.classState}
          />
          {showRules ? (
            <div className="flex flex-col gap-2">
              <p className="ds-text-section-label text-ink-2">{t("classDetails.rules.title")}</p>
              <div className="overflow-hidden rounded-card border border-line bg-surface">
                <ClassRuleRow icon="Ionicons:close-circle-outline" title={t("classDetails.rules.cancellation")} value={scenario.deadline === "none" ? t("classDetails.rules.read") : t("classDetails.rules.until", { when: deadline })} />
                <div className="h-px bg-line" />
                <ClassRuleRow icon="Ionicons:shield-outline" title={t("classDetails.rules.school")} value={t("classDetails.rules.schoolCount", { count: 3 })} />
              </div>
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <p className="ds-text-section-label text-ink-2">{t("classDetails.notes")}</p>
            <div className="flex gap-3 rounded-card border border-line bg-surface px-4 py-3.5">
              <span className="pt-1 text-lagoon">
                <AppIcon name="Ionicons:reader-outline" size={17} />
              </span>
              <p className="ds-text-card-meta flex-1 text-ink">{texts.notes}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="ds-text-section-label text-ink-2">{t("classDetails.location")}</p>
            <ClassLocationCard name="Praia de Iracema" address="Av. Beira Mar, 2200 – Meireles, Fortaleza" directionsLabel={t("classDetails.directions")} />
          </div>
        </div>
        {cta || deadlineNote ? (
          <div className="flex flex-col gap-3 border-t border-line bg-page px-5 pb-8 pt-3">
            {cta ? <Button variant={cta.variant} className="w-full">{t(`enrolment.cta.${cta.key}`)}</Button> : null}
            {deadlineNote ? (
              <>
                <p className="ds-text-list-subtitle text-ink-2">{t(`enrolment.cancelSeatNote.${deadlineNote}`, { deadline: dates.deadlinePassed })}</p>
                <ContactSchoolButton label={t("closedAccount.contactSchool")} />
              </>
            ) : null}
          </div>
        ) : null}
        {toast ? <ScreenToast message={t(toast.key)} tone={toast.tone} /> : null}
        {sheet === "denial" ? <DenialReasonSheet locale={locale} discipline="surf" level="beginner" start={dates.classStart} reason={withoutReason ? undefined : texts.denialReason} /> : null}
        {sheet === "withdraw" ? <WithdrawRequestSheet locale={locale} /> : null}
        {sheet === "cancelSeat" ? <CancelSeatSheet locale={locale} deadline={dates.deadlineAhead} /> : null}
        {sheet?.startsWith("request") ? (
          <RequestSeatSheet
            locale={locale}
            waitingList={sheet === "requestWaitingList"}
            rule={sheet === "requestNoDeadline" ? "noDeadline" : sheet === "requestNoRule" ? "noRule" : "deadline"}
            deadline={dates.deadlineAhead}
            sending={sheet === "requestSending"}
            classCard={classCard}
          />
        ) : null}
      </div>
    </PhoneFrame>
  );
}
