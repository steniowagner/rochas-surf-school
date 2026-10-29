import { ClassCard } from "@/modules/designs/components/class-card";
import { ClassCardSkeleton } from "@/modules/designs/components/class-card-skeleton";
import { DisciplineFilter } from "@/modules/designs/components/discipline-filter";
import { EmptyState } from "@/modules/designs/components/empty-state";
import { ErrorState } from "@/modules/designs/components/error-state";
import { HistoryDayLabel } from "@/modules/designs/components/history-day-label";
import { HistoryListHeader } from "@/modules/designs/components/history-list-header";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { WeekMonthCalendar } from "@/modules/designs/components/week-month-calendar";
import { buildMockCalendar } from "@/modules/designs/data/mock-calendar";
import { historyWeeks, myClasses, studentDates } from "@/modules/designs/data/student-app";
import { appT } from "@/modules/designs/i18n/app-t";

import type { MyHistoryScreenProps } from "./my-history-screen.types";

const LOADING_CARDS = [0, 1, 2];
const finished = myClasses.find((row) => row.key === "finished")?.card;
const days = [
  { date: "2026-09-05", classes: 1 },
  { date: "2026-09-03", classes: 2 },
  { date: "2026-09-01", classes: 1 },
];

/** "Aulas anteriores": the month's calendar with the days the student took a class marked, and the classes by day. */
export function MyHistoryScreen({ locale, state }: MyHistoryScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const dates = studentDates(locale);
  const calendar = buildMockCalendar(locale);
  const daySelected = state === "daySelected";
  const shownDays = daySelected ? days.filter((day) => day.date === "2026-09-03") : days;
  const empty = state === "emptyPeriod";
  const selectedLabel = dates.shortDay("2026-09-03");

  return (
    <PhoneFrame tall={state === "month"}>
      <div className="flex flex-1 flex-col bg-page">
        <StackHeader title={t("myHistory.title")} />
        <div className="flex flex-1 flex-col gap-5 px-5 pb-24 pt-2">
          <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-3">
            <WeekMonthCalendar
              view="month"
              caption={dates.monthCaption}
              previousLabel={t("weekMonthCalendar.previousMonth")}
              nextLabel={t("weekMonthCalendar.nextMonth")}
              week={calendar.week}
              month={{ initials: calendar.month.initials, weeks: historyWeeks(daySelected ? 3 : null), selectedWeekIndex: daySelected ? 0 : -1 }}
            />
            <div className="flex items-center gap-2 px-1.5">
              <span className="size-1.5 rounded-full bg-lagoon" />
              <p className="ds-text-list-subtitle text-ink-2">{t("myHistory.legend")}</p>
            </div>
          </div>
          <HistoryListHeader title={t("myHistory.allClasses")} caption={dates.historyCaption} dayLabel={daySelected ? selectedLabel : null} clearDayLabel={t("myHistory.clearDay", { date: selectedLabel })} />
          {state === "loading" ? (
            <div role="status" aria-label={t("myHistory.loading")} className="flex flex-col gap-3">
              {LOADING_CARDS.map((key) => (
                <ClassCardSkeleton key={key} />
              ))}
            </div>
          ) : state === "error" ? (
            <div className="flex pt-4">
              <ErrorState title={t("myHistory.loadError.title")} description={t("myHistory.loadError.description")} retryLabel={t("common.tryAgain")} />
            </div>
          ) : empty ? (
            <div className="flex pt-4">
              <EmptyState icon="Ionicons:calendar-outline" title={t("myHistory.emptyPeriod.title")} description={t("myHistory.emptyPeriod.description")} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {shownDays.map((day) => (
                <div key={day.date} className="flex flex-col gap-3">
                  <HistoryDayLabel label={dates.dayLine(day.date)} />
                  {finished ? Array.from({ length: day.classes }, (_, index) => <ClassCard key={index} locale={locale} {...finished} timeRange={index === 0 ? "08:00 – 09:30" : "16:00 – 17:30"} />) : null}
                </div>
              ))}
            </div>
          )}
        </div>
        <DisciplineFilter locale={locale} value="all" aboveTabBar={false} />
      </div>
    </PhoneFrame>
  );
}
