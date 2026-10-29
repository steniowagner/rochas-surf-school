import { ClassCard } from "@/modules/designs/components/class-card";
import { ClassCardSkeleton } from "@/modules/designs/components/class-card-skeleton";
import { DisciplineFilter } from "@/modules/designs/components/discipline-filter";
import { EmptyState } from "@/modules/designs/components/empty-state";
import { ErrorState } from "@/modules/designs/components/error-state";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { TabBar } from "@/modules/designs/components/tab-bar";
import { UserHeader } from "@/modules/designs/components/user-header";
import { WeekMonthCalendar } from "@/modules/designs/components/week-month-calendar";
import { buildMockCalendar } from "@/modules/designs/data/mock-calendar";
import { agendaClasses, septemberWeeks, studentDates, studentTabs } from "@/modules/designs/data/student-app";
import { people } from "@/modules/designs/data/fortaleza";
import { appT } from "@/modules/designs/i18n/app-t";

import type { AgendaScreenProps } from "./agenda-screen.types";

const LOADING_CARDS = [0, 1, 2, 3];

/** The student's "Agenda" tab: the user header and the calendar on the band, the day's classes and the sport filter. */
export function AgendaScreen({ locale, state, }: AgendaScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const dates = studentDates(locale);
  const calendar = buildMockCalendar(locale);
  const isMonth = state === "month";
  const classes = state === "filtered" ? agendaClasses.filter((item) => item.discipline === "surf") : agendaClasses;

  return (
    <PhoneFrame tall={state === "week"}>
      <div className="flex flex-1 flex-col bg-page">
        <div className="flex flex-col gap-4 border-b border-band-line bg-band px-5 pb-4 pt-2">
          <UserHeader
            name={people.name}
            firstName={people.firstName}
            greeting={t("userHeader.greeting.morning")}
            notificationsLabel={t("userHeader.notificationsUnread", { count: 2 })}
            unreadCount={2}
          />
          <WeekMonthCalendar
            view={isMonth ? "month" : "week"}
            caption={isMonth ? dates.monthCaption : dates.weekCaption}
            previousLabel={t(isMonth ? "weekMonthCalendar.previousMonth" : "weekMonthCalendar.previousWeek")}
            nextLabel={t(isMonth ? "weekMonthCalendar.nextMonth" : "weekMonthCalendar.nextWeek")}
            week={calendar.week}
            month={{ initials: calendar.month.initials, weeks: septemberWeeks, selectedWeekIndex: 1 }}
          />
        </div>
        <div className="flex flex-1 flex-col px-5 pb-28 pt-4">
          {state === "loading" ? (
            <div role="status" aria-label={t("classesWeek.loading")} className="flex flex-col gap-3">
              {LOADING_CARDS.map((key) => (
                <ClassCardSkeleton key={key} />
              ))}
            </div>
          ) : state === "error" ? (
            <div className="flex pt-8">
              <ErrorState title={t("classesWeek.loadError.title")} description={t("classesWeek.loadError.description", { date: dates.longDay })} retryLabel={t("common.tryAgain")} />
            </div>
          ) : state === "empty" ? (
            <div className="flex pt-8">
              <EmptyState icon="Ionicons:calendar-outline" title={t("classesWeek.emptyDay.title")} description={t("classesWeek.emptyDay.description", { date: dates.longDay })} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {classes.map((item) => (
                <ClassCard key={`${item.timeRange}-${item.discipline}`} locale={locale} {...item} />
              ))}
            </div>
          )}
        </div>
        <TabBar tabs={studentTabs(locale)} selected="agenda" />
        <DisciplineFilter locale={locale} value={state === "filtered" ? "surf" : "all"} open={state === "filterOpen"} />
      </div>
    </PhoneFrame>
  );
}
