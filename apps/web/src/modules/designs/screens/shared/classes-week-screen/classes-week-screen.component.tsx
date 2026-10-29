import { ClassCard } from "@/modules/designs/components/class-card";
import { ClassCardSkeleton } from "@/modules/designs/components/class-card-skeleton";
import { DisciplineFilter } from "@/modules/designs/components/discipline-filter";
import { EmptyState } from "@/modules/designs/components/empty-state";
import { ErrorState } from "@/modules/designs/components/error-state";
import { HeaderButton } from "@/modules/designs/components/header-button";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { TabBar } from "@/modules/designs/components/tab-bar";
import { UserHeader } from "@/modules/designs/components/user-header";
import { WeekMonthCalendar } from "@/modules/designs/components/week-month-calendar";
import { adminDates, adminTabs } from "@/modules/designs/data/admin-app";
import { adminDayClasses, instructorDayClasses, people } from "@/modules/designs/data/fortaleza";
import { instructorDates, instructorTabs } from "@/modules/designs/data/instructor-app";
import { buildMockCalendar } from "@/modules/designs/data/mock-calendar";
import { agendaClasses, septemberWeeks, studentDates, studentTabs } from "@/modules/designs/data/student-app";
import { appT } from "@/modules/designs/i18n/app-t";

import type { ClassesWeekScreenProps } from "./classes-week-screen.types";

const LOADING_CARDS = [0, 1, 2, 3];

/** The week's classes: the calendar, the selected day's classes and the sport filter, in the student's, the instructor's or the admin's form. */
export function ClassesWeekScreen({ locale, state, role = "student" }: ClassesWeekScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const dates = studentDates(locale);
  const calendar = buildMockCalendar(locale);
  const isMonth = state === "month";
  const admin = role === "admin";
  // The admin's tab is the instructor's, under its title and with the admin's tools.
  const instructor = role === "instructor" || admin;
  const adminDays = adminDates(locale);
  // The admin's empty day is Tuesday 8, after today; the past one is Friday 4, in the week before.
  const adminEmptyDay = state === "pastEmpty" ? "2026-09-04" : "2026-09-08";
  const emptyDay = admin && (state === "empty" || state === "pastEmpty");
  // The student's agenda shows the class of the details' day; the instructor's tab opens on today.
  const longDay = emptyDay ? adminDays.longDay(adminEmptyDay) : instructor ? instructorDates(locale).longDay : dates.longDay;
  const week = admin && state === "pastEmpty" ? { days: adminDays.pastWeek.days } : instructor ? { days: calendar.week.days.map((day) => ({ ...day, selected: emptyDay ? day.date === adminEmptyDay : day.today })) } : calendar.week;
  const weeks = instructor ? septemberWeeks.map((row) => row.map((day) => ({ ...day, selected: day.today }))) : septemberWeeks;
  const filteredDiscipline = instructor ? "skate" : "surf";
  const dayClasses = admin ? adminDayClasses : instructor ? instructorDayClasses : agendaClasses;
  // The app's `canCreateOnDay`: the admin creates on today or a later day.
  const canCreate = admin && state !== "pastEmpty";
  const classes = state === "filtered" ? dayClasses.filter((item) => item.discipline === filteredDiscipline) : dayClasses;
  const calendarView = (
    <WeekMonthCalendar
      view={isMonth ? "month" : "week"}
      caption={isMonth ? dates.monthCaption : admin && state === "pastEmpty" ? adminDays.pastWeek.caption : dates.weekCaption}
      previousLabel={t(isMonth ? "weekMonthCalendar.previousMonth" : "weekMonthCalendar.previousWeek")}
      nextLabel={t(isMonth ? "weekMonthCalendar.nextMonth" : "weekMonthCalendar.nextWeek")}
      week={week}
      month={{ initials: calendar.month.initials, weeks, selectedWeekIndex: 1 }}
    />
  );

  return (
    <PhoneFrame tall={state === "week"}>
      <div className="flex flex-1 flex-col bg-page">
        {admin ? <StackHeader title={t("tabs.classes")} showBack={false} right={canCreate ? <HeaderButton icon="Ionicons:add" label={t("classesWeek.newClass")} /> : undefined} /> : null}
        {instructor ? (
          <div data-testid="classes-week-calendar" className="px-5 pb-4 pt-2">
            {calendarView}
          </div>
        ) : (
          <div className="flex flex-col gap-4 border-b border-band-line bg-band px-5 pb-4 pt-2">
            <UserHeader
              name={people.name}
              firstName={people.firstName}
              greeting={t("userHeader.greeting.morning")}
              notificationsLabel={t("userHeader.notificationsUnread", { count: 2 })}
              unreadCount={2}
            />
            {calendarView}
          </div>
        )}
        <div className={`flex flex-1 flex-col px-5 pb-28${instructor ? "" : " pt-4"}`}>
          {state === "loading" ? (
            <div role="status" aria-label={t("classesWeek.loading")} className="flex flex-col gap-3">
              {LOADING_CARDS.map((key) => (
                <ClassCardSkeleton key={key} />
              ))}
            </div>
          ) : state === "error" ? (
            <div className="flex pt-8">
              <ErrorState title={t("classesWeek.loadError.title")} description={t("classesWeek.loadError.description", { date: longDay })} retryLabel={t("common.tryAgain")} />
            </div>
          ) : state === "empty" || state === "pastEmpty" ? (
            <div className="flex pt-8">
              <EmptyState
                icon="Ionicons:calendar-outline"
                title={t("classesWeek.emptyDay.title")}
                description={t("classesWeek.emptyDay.description", { date: longDay })}
                action={canCreate ? { label: t("classesWeek.create"), icon: "Ionicons:add" } : undefined}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {classes.map((item) => (
                <ClassCard key={`${item.timeRange}-${item.discipline}`} locale={locale} {...item} />
              ))}
            </div>
          )}
        </div>
        <TabBar tabs={admin ? adminTabs(locale) : instructor ? instructorTabs(locale) : studentTabs(locale)} selected={instructor ? "classes" : "agenda"} />
        <DisciplineFilter locale={locale} value={state === "filtered" ? filteredDiscipline : "all"} open={state === "filterOpen"} />
      </div>
    </PhoneFrame>
  );
}
