import { ClassCard } from "@/modules/designs/components/class-card";
import { ClassCardSkeleton } from "@/modules/designs/components/class-card-skeleton";
import { DisciplineFilter } from "@/modules/designs/components/discipline-filter";
import { EmptyState } from "@/modules/designs/components/empty-state";
import { ErrorState } from "@/modules/designs/components/error-state";
import { HeaderButton } from "@/modules/designs/components/header-button";
import { MyClassesFilters } from "@/modules/designs/components/my-classes-filters";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { TabBar } from "@/modules/designs/components/tab-bar";
import { myClasses, studentTabs } from "@/modules/designs/data/student-app";
import { appT } from "@/modules/designs/i18n/app-t";

import type { MyClassesScreenProps } from "./my-classes-screen.types";

const LOADING_CARDS = [0, 1, 2, 3];

/** The student's "Reservas" tab: every class they asked for, by status. */
export function MyClassesScreen({ locale, state }: MyClassesScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const filter = state === "pending" || state === "confirmed" || state === "ended" ? state : state === "emptyFilter" ? "pending" : "all";
  const rows = myClasses.filter((row) => (filter === "all" ? true : row.filters.includes(filter)) && (state !== "sport" || row.card.discipline === "surf"));

  return (
    <PhoneFrame tall={state === "all"}>
      <div className="flex flex-1 flex-col bg-page">
        <StackHeader title={t("myClasses.title")} showBack={false} right={<HeaderButton icon="Ionicons:time-outline" label={t("myClasses.history")} />} />
        <div className="flex flex-1 flex-col gap-4 px-5 pb-28 pt-2">
          <MyClassesFilters locale={locale} selected={filter} />
          {state === "loading" ? (
            <div role="status" aria-label={t("myClasses.loading")} className="flex flex-col gap-3">
              {LOADING_CARDS.map((key) => (
                <ClassCardSkeleton key={key} />
              ))}
            </div>
          ) : state === "error" ? (
            <div className="flex pt-12">
              <ErrorState title={t("myClasses.loadError.title")} description={t("myClasses.loadError.description")} retryLabel={t("common.tryAgain")} />
            </div>
          ) : state === "empty" || state === "emptyFilter" ? (
            <div className="flex pt-12">
              <EmptyState icon="Ionicons:calendar-outline" title={t("myClasses.empty.title")} description={t(state === "empty" ? "myClasses.empty.all" : "myClasses.empty.filtered")} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {rows.map((row) => (
                <ClassCard key={row.key} locale={locale} {...row.card} />
              ))}
            </div>
          )}
        </div>
        <TabBar tabs={studentTabs(locale)} selected="myClasses" />
        <DisciplineFilter locale={locale} value={state === "sport" ? "surf" : "all"} />
      </div>
    </PhoneFrame>
  );
}
