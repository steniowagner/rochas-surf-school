import { AdminToolRow } from "@/modules/designs/components/admin-tool-row";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { SchoolRulesEntryRow } from "@/modules/designs/components/school-rules-entry-row";
import { ScreenToast } from "@/modules/designs/components/screen-toast";
import { TabBar } from "@/modules/designs/components/tab-bar";
import { TeachingClassesEntryRow } from "@/modules/designs/components/teaching-classes-entry-row";
import { UserHeader } from "@/modules/designs/components/user-header";
import { WeeklyOccupancyEntryRow } from "@/modules/designs/components/weekly-occupancy-entry-row";
import { adminTabs } from "@/modules/designs/data/admin-app";
import { adminAccount, adminHome } from "@/modules/designs/data/fortaleza";
import { appT } from "@/modules/designs/i18n/app-t";

import type { HomeScreenProps } from "./home-screen.types";

/**
 * The admin's "Início" tab: the user header, the "Ferramentas" card with what waits as badges, and the "Escola" card.
 * "Minhas aulas" shows only for an admin who teaches, once that is known; the counts are left out while they load.
 */
export function HomeScreen({ locale, state, toast }: HomeScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const loaded = state !== "loading";
  // Nothing waits for the admin who doesn't teach: the badges are left out, as at 0.
  const badge = (count: number) => (state === "home" ? count : undefined);

  return (
    <PhoneFrame tall={state === "home" && !toast}>
      <div className={`flex flex-1 flex-col bg-page${toast ? " min-h-0" : ""}`}>
        <div className="bg-page px-5 pb-2 pt-3">
          <UserHeader
            name={adminAccount.name}
            firstName={adminAccount.firstName}
            greeting={t("userHeader.greeting.morning")}
            notificationsLabel={t("userHeader.notificationsUnread", { count: adminHome.unreadNotifications })}
            unreadCount={adminHome.unreadNotifications}
          />
        </div>
        <div className={`flex flex-1 flex-col gap-6 px-5 pb-6 pt-4${toast ? " min-h-0 overflow-hidden" : ""}`}>
          <div className="flex flex-col gap-2">
            <h2 className="ds-text-section-label text-ink-2">{t("admin.home.toolsSection")}</h2>
            <div className="overflow-hidden rounded-card border border-line bg-surface">
              <AdminToolRow grouped="first" icon="MaterialCommunityIcons:plus-circle-outline" title={t("admin.home.newClassRow")} />
              <AdminToolRow grouped="next" icon="MaterialCommunityIcons:calendar-month-outline" title={t("admin.home.classRequestsRow")} subtitle={t("admin.home.classRequestsSubtitle")} badge={badge(adminHome.classRequests)} />
              <AdminToolRow grouped="next" icon="MaterialCommunityIcons:account-plus-outline" title={t("admin.home.registrationsRow")} subtitle={t("admin.home.registrationsSubtitle")} badge={badge(adminHome.registrations)} />
              <AdminToolRow grouped="next" icon="MaterialCommunityIcons:account-check-outline" title={t("admin.home.enrolStudentRow")} subtitle={t("admin.home.enrolStudentSubtitle")} />
              <AdminToolRow grouped="next" icon="MaterialCommunityIcons:account-off-outline" title={t("admin.home.removedAccountsRow")} subtitle={t("admin.home.removedAccountsSubtitle")} badge={badge(adminHome.removedAccounts)} />
              <AdminToolRow grouped="next" icon="MaterialCommunityIcons:account-reactivate-outline" title={t("admin.home.reactivationsRow")} subtitle={t("admin.home.reactivationsSubtitle")} badge={badge(adminHome.reactivations)} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="ds-text-section-label text-ink-2">{t("admin.home.schoolSection")}</h2>
            <div className="overflow-hidden rounded-card border border-line bg-surface">
              {state === "home" ? <TeachingClassesEntryRow locale={locale} grouped="first" count={adminHome.assignedClasses} /> : null}
              {/* The app's rules row is "next" even when "Minhas aulas" is left out, so it keeps its top line. */}
              <SchoolRulesEntryRow locale={locale} role="admin" grouped="next" count={loaded ? adminHome.schoolRules : null} />
              <WeeklyOccupancyEntryRow locale={locale} grouped="next" />
              <AdminToolRow grouped="next" icon="MaterialCommunityIcons:calendar-remove-outline" title={t("admin.home.cancellationRulesRow")} subtitle={t("admin.home.cancellationRulesSubtitle")} />
              <AdminToolRow grouped="next" icon="MaterialCommunityIcons:bullhorn-outline" title={t("admin.home.sendNoticeRow")} subtitle={t("admin.home.sendNoticeSubtitle")} />
              <AdminToolRow grouped="next" icon="MaterialCommunityIcons:tune-variant" title={t("admin.home.schoolSettingsRow")} />
            </div>
          </div>
        </div>
        <TabBar tabs={adminTabs(locale)} selected="home" />
        {toast ? <ScreenToast message={t(toast.key, toast.params)} tone="success" /> : null}
      </div>
    </PhoneFrame>
  );
}
