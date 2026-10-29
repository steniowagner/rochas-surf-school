import { AppIcon } from "@/modules/designs/components/app-icon";
import { Button } from "@/modules/designs/components/button";
import { ClassCard } from "@/modules/designs/components/class-card";
import { ClassCardSkeleton } from "@/modules/designs/components/class-card-skeleton";
import { DisciplineFilter } from "@/modules/designs/components/discipline-filter";
import { EmptyState } from "@/modules/designs/components/empty-state";
import { EnrolStudentStudentsSkeleton } from "@/modules/designs/components/enrol-student-students-skeleton";
import { PersonAvatar } from "@/modules/designs/components/person-avatar";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { PhoneNumberField } from "@/modules/designs/components/phone-number-field";
import { SegmentedControl } from "@/modules/designs/components/segmented-control";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { StepTabs } from "@/modules/designs/components/step-tabs";
import { TextInput } from "@/modules/designs/components/text-input";
import { WeekMonthCalendar } from "@/modules/designs/components/week-month-calendar";
import { enrolDayClasses, enrolStudents } from "@/modules/designs/data/fortaleza";
import { buildMockCalendar } from "@/modules/designs/data/mock-calendar";
import { septemberWeeks, studentDates } from "@/modules/designs/data/student-app";
import { appT } from "@/modules/designs/i18n/app-t";

import type { EnrolStudentScreenProps } from "./enrol-student-screen.types";

const LOADING_CLASSES = [0, 1];
const CHOSEN = "Caio Sousa";

/** "Inscrever aluno": who (a student of the school or a trial class's guest), then the class, in two steps. */
export function EnrolStudentScreen({ locale, state }: EnrolStudentScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const classStep = state === "classes" || state === "noClasses" || state === "classesLoading";
  const chosen = classStep || state === "studentChosen";
  const calendar = buildMockCalendar(locale);
  // The class step opens on today; the day without classes is Tuesday 8.
  const selectedDay = state === "noClasses" ? "2026-09-08" : "2026-09-07";

  return (
    <PhoneFrame tall={state === "students" || state === "classes"}>
      <div className="flex flex-1 flex-col bg-page">
        <StackHeader title={t("enrolStudent.title")} />
        <div className={`flex flex-1 flex-col gap-5 px-5 pt-2 ${classStep ? "pb-28" : "pb-6"}`}>
          <StepTabs
            selected={classStep ? "class" : "who"}
            steps={[
              { key: "who", label: t("enrolStudent.steps.who"), value: chosen ? CHOSEN : t("enrolStudent.steps.pending"), done: chosen },
              { key: "class", label: t("enrolStudent.steps.class"), value: t("enrolStudent.steps.pending"), done: false, disabled: !chosen },
            ]}
          />
          {classStep ? (
            <>
              <WeekMonthCalendar
                view="week"
                caption={studentDates(locale).weekCaption}
                previousLabel={t("weekMonthCalendar.previousWeek")}
                nextLabel={t("weekMonthCalendar.nextWeek")}
                week={{ days: calendar.week.days.map((day) => ({ ...day, selected: day.date === selectedDay })) }}
                month={{ initials: calendar.month.initials, weeks: septemberWeeks, selectedWeekIndex: 1 }}
              />
              {state === "classesLoading" ? (
                <div role="status" aria-label={t("enrolStudent.classes.loading")} className="flex flex-col gap-3">
                  {LOADING_CLASSES.map((key) => (
                    <ClassCardSkeleton key={key} />
                  ))}
                </div>
              ) : state === "noClasses" ? (
                <div className="flex">
                  <EmptyState icon="Ionicons:calendar-outline" title={t("enrolStudent.classes.empty.title")} description={t("enrolStudent.classes.empty.description")} />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {enrolDayClasses.map((item) => {
                    const full = item.seatsTaken >= item.capacity;

                    return (
                      <div key={item.timeRange} data-testid="enrol-class" aria-disabled={full} className={`rounded-card border-2 border-transparent ${full ? "opacity-50" : ""}`}>
                        <ClassCard locale={locale} {...item} />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <SegmentedControl
                options={[
                  { value: "trial", label: t("enrolStudent.modeTrial") },
                  { value: "student", label: t("enrolStudent.modeStudent") },
                ]}
                value={state === "trial" ? "trial" : "student"}
              />
              {state === "trial" ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <p className="ds-text-section-label text-ink-2">{t("enrolStudent.trial.nameLabel")}</p>
                    <TextInput placeholder={t("enrolStudent.trial.namePlaceholder")} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="ds-text-section-label text-ink-2">{t("enrolStudent.trial.whatsappLabel")}</p>
                    <PhoneNumberField country="🇧🇷" dialCode="+55" placeholder="85 99999 9999" />
                  </div>
                  <p className="ds-text-list-subtitle text-ink-2">{t("enrolStudent.trial.note")}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <TextInput
                    icon={<AppIcon name="Ionicons:search" size={20} className="text-ink-2" />}
                    value={state === "noStudents" ? "Rodrigo" : ""}
                    placeholder={t("enrolStudent.searchPlaceholder")}
                    clearable
                  />
                  {state === "studentsLoading" ? (
                    <EnrolStudentStudentsSkeleton locale={locale} />
                  ) : state === "noStudents" ? (
                    <div className="flex">
                      <EmptyState icon="Ionicons:people-outline" title={t("enrolStudent.students.empty.title")} description={t("enrolStudent.students.empty.description")} />
                    </div>
                  ) : (
                    <div role="radiogroup" className="max-h-72 overflow-hidden rounded-card border border-line bg-surface">
                      {enrolStudents.map((student, index) => {
                        const selected = state === "studentChosen" && student.name === CHOSEN;

                        return (
                          <div key={student.id} role="radio" aria-checked={selected} aria-label={student.name} className={`flex min-h-14 items-center gap-3 px-4 py-2 ${index === 0 ? "" : "border-t border-line"}`}>
                            <PersonAvatar name={student.name} />
                            <p className="ds-text-list-title flex-1 truncate text-ink">{student.name}</p>
                            <AppIcon name={selected ? "Ionicons:radio-button-on" : "Ionicons:radio-button-off"} size={22} className={selected ? "text-grape" : "text-ink-3"} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        {classStep ? <DisciplineFilter locale={locale} value="all" /> : null}
        <div className="border-t border-line bg-page px-5 pb-8 pt-3">
          {/* "Inscrever" waits for a class; "Escolher aula" for who. */}
          <Button className="w-full" disabled={classStep || !chosen}>
            {t(classStep ? "enrolStudent.submitEmpty" : "enrolStudent.next")}
          </Button>
        </div>
      </div>
    </PhoneFrame>
  );
}
