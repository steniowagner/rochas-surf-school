import { appT } from "@/modules/designs/i18n/app-t";

import { ClassCardSkeleton } from "../class-card-skeleton";
import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";
import { EmptyState } from "../empty-state";
import { ErrorState } from "../error-state";
import { PhoneFrame } from "../phone-frame";
import { Skeleton } from "../skeleton";
import { StackHeader } from "../stack-header";
import { TabBar } from "../tab-bar";

import type { DesignSystemSectionProps } from "./design-system-states.types";

export function DesignSystemStates({ locale, text }: DesignSystemSectionProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const e = text.entries;
  const error = { title: t("classesWeek.loadError.title"), description: t("classesWeek.loadError.description", { date: "12/09" }), retryLabel: t("common.tryAgain") };
  const empty = { icon: "Ionicons:calendar-outline" as const, title: t("classesWeek.emptyDay.title"), description: t("classesWeek.emptyDay.description", { date: "12/09" }) };
  const tabs = [
    { key: "agenda", label: t("tabs.agenda"), icon: "Ionicons:calendar-outline" },
    { key: "myClasses", label: t("tabs.myClasses"), icon: "Ionicons:ticket-outline" },
    { key: "school", label: t("tabs.school"), icon: "Feather:users" },
    { key: "profile", label: t("tabs.profile"), icon: "FontAwesome6:circle-user" },
  ] as const;
  const screen = (body: React.ReactNode, caption: string) => (
    <PhoneFrame caption={caption} contentClassName="justify-between">
      <StackHeader title={t("classesWeek.newClass")} showBack={false} />
      <div className="flex flex-1 flex-col gap-3 px-5 py-3">{body}</div>
      <TabBar tabs={[...tabs]} selected="agenda" />
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
            <EmptyState {...empty} action={{ label: t("classesWeek.create"), icon: "Ionicons:calendar-outline" }} />
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
          {screen(<EmptyState {...empty} action={{ label: t("classesWeek.create") }} />, empty.title)}
          {screen(<ErrorState {...error} />, error.title)}
        </div>
      </DesignEntry>
    </DesignSection>
  );
}
