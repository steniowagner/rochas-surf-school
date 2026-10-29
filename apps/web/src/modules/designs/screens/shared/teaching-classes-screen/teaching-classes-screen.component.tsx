import { AppIcon } from "@/modules/designs/components/app-icon";
import { ClassCard } from "@/modules/designs/components/class-card";
import { ClassCardSkeleton } from "@/modules/designs/components/class-card-skeleton";
import { DisciplineFilter } from "@/modules/designs/components/discipline-filter";
import { EmptyState } from "@/modules/designs/components/empty-state";
import { ErrorState } from "@/modules/designs/components/error-state";
import { HeaderButton } from "@/modules/designs/components/header-button";
import { OngoingClassCard } from "@/modules/designs/components/ongoing-class-card";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { ScreenIntro } from "@/modules/designs/components/screen-intro";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { TeachingDayHeader } from "@/modules/designs/components/teaching-day-header";
import { teachingClasses } from "@/modules/designs/data/fortaleza";
import { instructorDates } from "@/modules/designs/data/instructor-app";
import { appT } from "@/modules/designs/i18n/app-t";

import type { TeachingClassesScreenProps } from "./teaching-classes-screen.types";

const LOADING_CARDS = [0, 1, 2, 3];

/** "Minhas aulas" of an instructor (and of an admin who teaches, the same screen): the intro, the class under way on grape, then the next classes by day, and the sport filter. */
export function TeachingClassesScreen({ locale, state }: TeachingClassesScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const dates = instructorDates(locale);
  const surfOnly = state === "filtered" || state === "emptyFiltered";
  // The intro gives way to the plain title on the error and empty states, which have their own icon and text.
  const showIntro = state !== "error" && state !== "empty" && state !== "emptyFiltered";
  const days = teachingClasses.days
    .map((day) => ({ ...day, classes: day.classes.filter((item) => !surfOnly || item.discipline === "surf") }))
    .filter((day) => day.classes.length > 0);
  const { ongoing } = teachingClasses;

  return (
    <PhoneFrame tall={state === "list"}>
      <div className="flex flex-1 flex-col bg-page">
        <StackHeader title={showIntro ? "" : t("teachingClasses.title")} right={<HeaderButton icon="Ionicons:time-outline" label={t("teachingHistory.title")} />} />
        <div className="flex flex-1 flex-col gap-3 px-5 pb-24 pt-2">
          {showIntro ? <ScreenIntro icon={<AppIcon name="Ionicons:calendar-outline" size={28} className="text-grape" />} title={t("teachingClasses.title")} description={t("teachingClasses.description")} /> : null}
          {state === "loading" ? (
            <div role="status" aria-label={t("teachingClasses.loading")} className="flex flex-col gap-3">
              {LOADING_CARDS.map((key) => (
                <ClassCardSkeleton key={key} />
              ))}
            </div>
          ) : state === "error" ? (
            <div className="flex pt-4">
              <ErrorState title={t("teachingClasses.loadError.title")} description={t("teachingClasses.loadError.description")} retryLabel={t("common.tryAgain")} />
            </div>
          ) : state === "empty" || state === "emptyFiltered" ? (
            <div className="flex pt-4">
              <EmptyState
                icon="Ionicons:calendar-outline"
                title={t(state === "empty" ? "teachingClasses.empty.title" : "teachingClasses.emptyFiltered.surf.title")}
                description={t(state === "empty" ? "teachingClasses.empty.description" : "teachingClasses.emptyFiltered.surf.description")}
              />
            </div>
          ) : (
            <>
              {state === "nothingOngoing" ? null : <OngoingClassCard locale={locale} {...ongoing} />}
              {days.map((day) => (
                <div key={day.date} className="flex flex-col gap-3">
                  <TeachingDayHeader label={day.label === "weekday" ? dates.dayName(day.date) : t(`teachingClasses.${day.label}`)} date={dates.shortDate(day.date)} />
                  {day.classes.map((item) => (
                    <ClassCard key={`${item.timeRange}-${item.discipline}`} locale={locale} {...item} />
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
        <DisciplineFilter locale={locale} value={surfOnly ? "surf" : "all"} aboveTabBar={false} />
      </div>
    </PhoneFrame>
  );
}
