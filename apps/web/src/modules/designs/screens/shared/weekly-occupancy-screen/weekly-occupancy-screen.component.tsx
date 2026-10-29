import { ClassCard } from "@/modules/designs/components/class-card";
import { EmptyState } from "@/modules/designs/components/empty-state";
import { ErrorState } from "@/modules/designs/components/error-state";
import { OccupancyMap } from "@/modules/designs/components/occupancy-map";
import { OccupancyMapSkeleton } from "@/modules/designs/components/occupancy-map-skeleton";
import { OccupancyStats } from "@/modules/designs/components/occupancy-stats";
import { OccupancyWeekBar } from "@/modules/designs/components/occupancy-week-bar";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { WeekPickerSheet } from "@/modules/designs/components/week-picker-sheet";
import { instructorDates, occupancyWeek } from "@/modules/designs/data/instructor-app";
import { buildMockCalendar } from "@/modules/designs/data/mock-calendar";
import { septemberWeeks } from "@/modules/designs/data/student-app";
import { appT } from "@/modules/designs/i18n/app-t";

import type { WeeklyOccupancyScreenProps } from "./weekly-occupancy-screen.types";

const THIS_WEEK = "2026-09-07";
const NEXT_WEEK = "2026-09-14";
const FULL_CLASS = "wed-1600";

/** "Ocupação semanal" of an instructor or an admin (the same screen): the week bar, the week's stats, the map of how full each class is and the selected class's card. */
export function WeeklyOccupancyScreen({ locale, state }: WeeklyOccupancyScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const dates = instructorDates(locale);
  const nextWeek = state === "nextWeek";
  const weekStart = nextWeek ? NEXT_WEEK : THIS_WEEK;
  const week = occupancyWeek(locale, weekStart);
  const selectedId = state === "otherSelected" ? FULL_CLASS : week.defaultSelectedId;
  const selected = week.classes.find((item) => item.id === selectedId);
  const picker = state === "picker";
  const marked = new Set(week.classes.map((item) => item.date));
  const pickerWeeks = septemberWeeks.map((row) => row.map((day) => ({ ...day, selected: false, marked: marked.has(day.date) })));

  return (
    <PhoneFrame tall={state === "week" || state === "otherSelected" || nextWeek}>
      <div className={`flex flex-1 flex-col bg-page${picker ? " min-h-0" : ""}`}>
        <StackHeader title={t("weeklyOccupancy.title")} />
        <div className={`flex flex-col gap-5 px-5 pb-8 pt-2${picker ? " min-h-0 flex-1 overflow-hidden" : ""}`}>
          <OccupancyWeekBar
            locale={locale}
            relativeLabel={t(`weeklyOccupancy.relativeWeek.${nextWeek ? "next" : "current"}`)}
            isCurrentWeek={!nextWeek}
            caption={dates.weekCaption(weekStart)}
          />
          {state === "loading" ? (
            <OccupancyMapSkeleton locale={locale} />
          ) : state === "error" ? (
            <div className="flex pt-4">
              <ErrorState title={t("weeklyOccupancy.loadError.title")} description={t("weeklyOccupancy.loadError.description")} retryLabel={t("common.tryAgain")} />
            </div>
          ) : state === "empty" ? (
            <div className="flex pt-4">
              <EmptyState icon="Ionicons:calendar-outline" title={t("weeklyOccupancy.empty.title")} description={t("weeklyOccupancy.empty.description")} />
            </div>
          ) : (
            <>
              <OccupancyStats locale={locale} stats={week.stats} />
              <OccupancyMap locale={locale} days={week.days} rows={week.rows} selectedId={selectedId} />
              {selected ? <ClassCard locale={locale} {...selected} showFlags /> : null}
            </>
          )}
        </div>
        {picker ? <WeekPickerSheet locale={locale} caption={dates.monthCaption} initials={buildMockCalendar(locale).month.initials} weeks={pickerWeeks} selectedWeekIndex={1} /> : null}
      </div>
    </PhoneFrame>
  );
}
