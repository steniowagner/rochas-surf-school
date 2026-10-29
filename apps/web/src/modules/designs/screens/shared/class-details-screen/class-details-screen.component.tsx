import { AppIcon } from "@/modules/designs/components/app-icon";
import { Button } from "@/modules/designs/components/button";
import { CancellationRulesSheet } from "@/modules/designs/components/cancellation-rules-sheet";
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
import { PersonSheet } from "@/modules/designs/components/person-sheet";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { RequestSeatSheet } from "@/modules/designs/components/request-seat-sheet";
import { ScreenToast } from "@/modules/designs/components/screen-toast";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { WithdrawRequestSheet } from "@/modules/designs/components/withdraw-request-sheet";
import { instructorAccount, otherInstructor, students, trialGuests } from "@/modules/designs/data/fortaleza";
import { studentDates } from "@/modules/designs/data/student-app";
import { appT } from "@/modules/designs/i18n/app-t";

import { getClassDetailsView } from "./class-details-screen.constants";
import type { ClassDetailsScreenProps } from "./class-details-screen.types";

/**
 * The class details: the class, the enrolment banner, the people, the rules, the notes, the place and the footer button
 * in the student's form; read-only in the instructor's, with the note of `readOnlyNoteKey` and no enrolment or footer.
 */
export function ClassDetailsScreen(props: ClassDetailsScreenProps) {
  const { locale, state, sheet, texts } = props;
  const toast = props.role === "instructor" ? undefined : props.toast;
  const withoutReason = props.role === "instructor" ? false : (props.withoutReason ?? false);
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const dates = studentDates(locale);

  if (props.state === "loading" || props.state === "notFound" || props.state === "error") {
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

  const view = getClassDetailsView(props.role === "instructor" ? { role: "instructor", state: props.state } : { state: props.state });
  const teacher = view.teacher === "none" ? [] : props.role === "instructor" ? [view.teacher === "viewer" ? { ...instructorAccount, isViewer: true } : otherInstructor] : [{ id: "rafael", name: "Rafael Rocha" }];
  const deadline = view.deadline === "ahead" ? dates.deadlineAhead : dates.deadlinePassed;
  const guests = view.guests ? trialGuests : [];
  const seatsTaken = view.noStudents ? 0 : (view.full ? 8 : view.classState === "finished" ? 5 : 4) + guests.length;
  const people = view.noStudents ? [] : view.inClass ? students.slice(0, 4) : students.slice(1, 5);
  const classCard = { discipline: "surf", level: "beginner", weekday: dates.weekdayLabel, date: dates.dayLabel, duration: `1 h 30 min`, timeRange: "08:00 – 09:30", locationName: "Praia de Iracema" } as const;
  const showRules = view.classState !== "cancelled";
  // D-02: a sheet or a toast is drawn over the phone's screen, so the content is clipped to it.
  const overPhone = Boolean(sheet || toast);

  return (
    <PhoneFrame tall={!overPhone}>
      <div className={`flex flex-1 flex-col bg-page${overPhone ? " min-h-0" : ""}`}>
        <StackHeader title="" />
        <div className={`flex flex-col gap-6 px-5 pb-6 pt-4${overPhone ? " min-h-0 flex-1 overflow-hidden" : ""}`}>
          <div className="flex flex-col gap-2">
            <div className="mb-1 flex flex-wrap gap-2">
              <Chip tone="surf">{t("newClass.discipline.surf")}</Chip>
              <Chip tone="info">{t("newClass.level.beginner")}</Chip>
            </div>
            <p className="ds-text-list-title text-ink-2">{dates.dateLine}</p>
            <p className="ds-text-kpi text-ink">08:00 – 09:30</p>
          </div>
          {view.classState === "started" ? <ClassInfoCard locale={locale} variant="started" start="08:00" end="09:30" /> : null}
          {view.classState === "cancelled" ? <ClassInfoCard locale={locale} variant="cancelled" /> : null}
          {view.showFullBanner ? <ClassFullBanner locale={locale} waitingList={view.fullBannerWaitingList} /> : null}
          {view.bannerStatus ? <EnrolmentBanner locale={locale} status={view.bannerStatus} reason={texts.takeOutReason} pressable={view.bannerStatus === "denied"} /> : null}
          {view.classState === "finished" ? <ClassInfoCard locale={locale} variant="finished" end="09:30" /> : null}
          <ClassPeople
            locale={locale}
            instructors={teacher}
            students={people.map((student) => ({ ...student }))}
            guests={guests.length > 0 ? guests : undefined}
            seatsTaken={seatsTaken}
            capacity={8}
            state={view.classState}
            expanded={view.expanded || undefined}
          />
          {view.readOnlyNoteKey ? (
            <div className="flex items-center gap-3 rounded-card bg-dim p-4">
              <AppIcon name="Ionicons:eye-outline" size={20} className="text-ink-2" />
              <p className="ds-text-list-subtitle flex-1 text-ink-2">{t(view.readOnlyNoteKey)}</p>
            </div>
          ) : null}
          {showRules ? (
            <div className="flex flex-col gap-2">
              <p className="ds-text-section-label text-ink-2">{t("classDetails.rules.title")}</p>
              <div className="overflow-hidden rounded-card border border-line bg-surface">
                <ClassRuleRow icon="Ionicons:close-circle-outline" title={t("classDetails.rules.cancellation")} value={view.deadline === "none" ? t("classDetails.rules.read") : t("classDetails.rules.until", { when: deadline })} />
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
        {view.cta || view.deadlineNote ? (
          <div className="flex flex-col gap-3 border-t border-line bg-page px-5 pb-8 pt-3">
            {view.cta ? <Button variant={view.cta.variant} className="w-full">{t(`enrolment.cta.${view.cta.key}`)}</Button> : null}
            {view.deadlineNote ? (
              <>
                <p className="ds-text-list-subtitle text-ink-2">{t(`enrolment.cancelSeatNote.${view.deadlineNote}`, { deadline: dates.deadlinePassed })}</p>
                <ContactSchoolButton label={t("closedAccount.contactSchool")} />
              </>
            ) : null}
          </div>
        ) : null}
        {toast ? <ScreenToast message={t(toast.key)} tone={toast.tone} /> : null}
        {sheet === "person" ? <PersonSheet locale={locale} name="Caio Sousa" role="student" whatsapp="+55 85 98888 7777" /> : null}
        {sheet === "rules" ? <CancellationRulesSheet locale={locale} status="ready" rules={texts.cancellationRules} /> : null}
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
