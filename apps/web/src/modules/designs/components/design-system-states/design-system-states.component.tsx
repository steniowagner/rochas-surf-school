import { monthWeeks, weekDays } from "@/modules/designs/data/fortaleza";
import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { ClassCardSkeleton } from "../class-card-skeleton";
import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";
import { EmptyState } from "../empty-state";
import { ErrorState } from "../error-state";
import { HeaderButton } from "../header-button";
import { PhoneFrame } from "../phone-frame";
import { Skeleton } from "../skeleton";
import { StackHeader } from "../stack-header";
import { TabBar } from "../tab-bar";
import { WeekMonthCalendar } from "../week-month-calendar";

import type { DesignSystemSectionProps } from "./design-system-states.types";

export function DesignSystemStates({ locale, text }: DesignSystemSectionProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const e = text.entries;
  const error = { title: t("classesWeek.loadError.title"), description: t("classesWeek.loadError.description", { date: "12/09" }), retryLabel: t("common.tryAgain") };
  const empty = { icon: "Ionicons:calendar-outline" as const, title: t("classesWeek.emptyDay.title"), description: t("classesWeek.emptyDay.description", { date: "12/09" }) };
  const tabs = [
    { key: "home", label: t("tabs.home"), icon: "Feather:home" },
    { key: "classes", label: t("tabs.classes"), icon: "Ionicons:calendar-outline" },
    { key: "people", label: t("tabs.people"), icon: "Feather:users" },
    { key: "profile", label: t("tabs.profile"), icon: "FontAwesome6:circle-user" },
  ] as const;
  const intl = { "pt-br": "pt-BR", es: "es-ES", en: "en-US" }[locale];
  const weekday = (date: string, style: "short" | "narrow") =>
    new Intl.DateTimeFormat(intl, { weekday: style, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)).replace(".", "").toUpperCase();
  const calendar = {
    view: "week" as const,
    caption: new Intl.DateTimeFormat(intl, { month: "long", timeZone: "UTC" }).format(new Date("2026-09-09T12:00:00Z")),
    previousLabel: t("weekMonthCalendar.previousWeek"),
    nextLabel: t("weekMonthCalendar.nextWeek"),
    week: { days: weekDays.map((day) => ({ ...day, weekday: weekday(day.date, "short") })) },
    month: { initials: monthWeeks[1]?.map((day) => weekday(day.date, "narrow")) ?? [], weeks: monthWeeks, selectedWeekIndex: 1 },
  };
  // The admin's classes screen as the app renders it: the title and the add button in the header, the week calendar,
  // the state under it, the floating sport filter and the staff tab bar.
  const screen = (body: React.ReactNode, caption: string) => (
    <PhoneFrame caption={caption} contentClassName="justify-between">
      <StackHeader
        title={t("tabs.classes")}
        showBack={false}
        right={<HeaderButton icon="Ionicons:add" label={t("classesWeek.newClass")} />}
      />
      <div className="px-5 pb-4">
        <WeekMonthCalendar {...calendar} />
      </div>
      <div className="flex flex-1 flex-col gap-3 px-5 pt-8">{body}</div>
      <span className="absolute bottom-28 right-5 flex size-14 items-center justify-center rounded-full bg-grape text-on-color shadow-primary" aria-hidden>
        <AppIcon name="Ionicons:filter" size={24} />
      </span>
      <TabBar tabs={[...tabs]} selected="classes" />
    </PhoneFrame>
  );

  return (
    <DesignSection number="09" title={text.sections.states.title} description={text.sections.states.description}>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <DesignEntry id="DS-09-01" title={e["DS-09-01"].title} note={e["DS-09-01"].note}>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["sand", "surface"] as const).map((tone) => (
              <div key={tone} className="flex flex-col gap-3 rounded-card bg-page p-3">
                <div className="flex items-center gap-3">
                  <Skeleton tone={tone} className="size-11 rounded-full" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton tone={tone} className="h-3 w-3/4 rounded-full" />
                    <Skeleton tone={tone} className="h-3 w-1/2 rounded-full" />
                  </div>
                </div>
                <Skeleton tone={tone} className="h-24 w-full rounded-card" />
              </div>
            ))}
          </div>
        </DesignEntry>
        <DesignEntry id="DS-09-02" title={e["DS-09-02"].title} note={e["DS-09-02"].note}>
          <div className="grid gap-4 sm:grid-cols-2">
            <EmptyState {...empty} action={{ label: t("classesWeek.create"), icon: "Ionicons:add" }} />
            <EmptyState {...empty} />
          </div>
        </DesignEntry>
        <DesignEntry id="DS-09-03" title={e["DS-09-03"].title} note={e["DS-09-03"].note}>
          <div className="grid gap-4 sm:grid-cols-2">
            <ErrorState {...error} />
            <ErrorState {...error} retrying />
          </div>
        </DesignEntry>
      </div>
      <DesignEntry id="DS-09-04" title={e["DS-09-04"].title} note={e["DS-09-04"].note}>
        <div className="grid items-start gap-4 sm:grid-cols-3">
          {screen(<><ClassCardSkeleton /><ClassCardSkeleton /></>, t("classesWeek.loading"))}
          {screen(<EmptyState {...empty} action={{ label: t("classesWeek.create"), icon: "Ionicons:add" }} />, empty.title)}
          {screen(<ErrorState {...error} />, error.title)}
        </div>
      </DesignEntry>
    </DesignSection>
  );
}
