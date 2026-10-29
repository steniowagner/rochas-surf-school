import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { SchoolRulesEntryRow } from "@/modules/designs/components/school-rules-entry-row";
import { TabBar } from "@/modules/designs/components/tab-bar";
import { TeachingClassesEntryRow } from "@/modules/designs/components/teaching-classes-entry-row";
import { UserHeader } from "@/modules/designs/components/user-header";
import { WeeklyOccupancyEntryRow } from "@/modules/designs/components/weekly-occupancy-entry-row";
import { instructorAccount, instructorHome } from "@/modules/designs/data/fortaleza";
import { instructorTabs } from "@/modules/designs/data/instructor-app";
import { appT } from "@/modules/designs/i18n/app-t";

import type { HomeScreenProps } from "./home-screen.types";

/** The instructor's "Início" tab: the user header, then the school's card with the entry rows; the counts are left out while they load. */
export function HomeScreen({ locale, state }: HomeScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const loading = state === "loading";

  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col bg-page">
        <div className="bg-page px-5 pb-2 pt-3">
          <UserHeader
            name={instructorAccount.name}
            firstName={instructorAccount.firstName}
            greeting={t("userHeader.greeting.morning")}
            notificationsLabel={t("userHeader.notificationsUnread", { count: instructorHome.unreadNotifications })}
            unreadCount={instructorHome.unreadNotifications}
          />
        </div>
        <div className="flex flex-1 flex-col gap-6 px-5 pb-6 pt-4">
          <div className="flex flex-col gap-2">
            <h2 className="ds-text-section-label text-ink-2">{t("admin.home.schoolSection")}</h2>
            <div className="overflow-hidden rounded-card border border-line bg-surface">
              <TeachingClassesEntryRow locale={locale} grouped="first" count={loading ? null : state === "noneAssigned" ? 0 : instructorHome.assignedClasses} />
              <SchoolRulesEntryRow locale={locale} role="instructor" grouped="next" count={loading ? null : instructorHome.schoolRules} />
              <WeeklyOccupancyEntryRow locale={locale} grouped="next" />
            </div>
          </div>
        </div>
        <TabBar tabs={instructorTabs(locale)} selected="home" />
      </div>
    </PhoneFrame>
  );
}
