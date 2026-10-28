import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { routes } from "@/constants/routes";
import { TeachingClassesEntryRow } from "@/modules/classes/components/teaching-classes-entry-row";
import { WeeklyOccupancyEntryRow } from "@/modules/classes/components/weekly-occupancy-entry-row";
import { usePendingRequests } from "@/modules/enrolment/hooks/use-pending-requests.hook";
import { useRemovedAccounts } from "@/modules/people/hooks/use-removed-accounts.hook";
import { SchoolRulesEntryRow } from "@/modules/school-rules/components/school-rules-entry-row";
import { useHeaderInset } from "@/navigation/stack-header";

import { AdminToolRow } from "../components/admin-tool-row";
import { useReactivationRequests } from "../hooks/use-reactivation-requests.hook";
import { useRegistrations } from "../hooks/use-registrations.hook";

const openRegistrations = () => router.push(routes.admin.registrations);
const openReactivations = () => router.push(routes.admin.reactivations);
const openClassRequests = () => router.push(routes.admin.classRequests);
const openEnrolStudent = () => router.push(routes.admin.enrolStudent);
const openRemovedAccounts = () => router.push(routes.admin.removedAccounts);
const openMyClasses = () => router.push(routes.admin.myClasses);
const openNewClass = () => router.push(routes.admin.newClass());
const openWeeklyOccupancy = () => router.push(routes.admin.weeklyOccupancy);
const openSchoolSettings = () => router.push(routes.admin.schoolSettings);
const openCancellationRules = () => router.push(routes.admin.cancellationRules);
const openSendNotice = () => router.push(routes.admin.sendNotice());
const openSchoolRules = () => router.push(routes.admin.manageSchoolRules);

export function AdminScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const headerInset = useHeaderInset();
  const { data } = useRegistrations();
  const { data: reactivations } = useReactivationRequests();
  const { data: pendingRequests } = usePendingRequests();
  const { data: removedAccounts } = useRemovedAccounts();

  // The counts show once loaded; while loading or after an error the rows have none.
  const registrationsCount = data?.items.length;
  const reactivationsCount = reactivations?.items.length;
  const requestsCount = pendingRequests?.total;
  const removedAccountsCount = removedAccounts?.items.length;

  return (
    <ScrollView
      testID="admin-home-scroll"
      className="flex-1 bg-page"
      // On iOS the top safe area and the floating tab bar are added by the scroll view.
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-6 px-screen"
      contentContainerStyle={{
        // The user header isn't the native bar, so the automatic inset clears it only up to the safe area.
        paddingTop: Math.max(headerInset - insets.top, 0) + 16,
        paddingBottom: Math.max(insets.bottom, 24),
      }}
    >
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="ds-text-section-label text-ink-2"
        >
          {t("admin.home.toolsSection")}
        </Text>
        <View className="overflow-hidden rounded-card border border-line bg-surface">
          <AdminToolRow
            grouped="first"
            icon="plus-circle-outline"
            title={t("admin.home.newClassRow")}
            onPress={openNewClass}
          />
          <AdminToolRow
            grouped="next"
            icon="calendar-month-outline"
            title={t("admin.home.classRequestsRow")}
            subtitle={
              requestsCount === undefined
                ? undefined
                : requestsCount
                  ? t("admin.home.classRequestsCount", {
                      count: requestsCount,
                    })
                  : t("admin.home.nothingPending")
            }
            badge={requestsCount}
            onPress={openClassRequests}
          />
          <AdminToolRow
            grouped="next"
            icon="account-plus-outline"
            title={t("admin.home.registrationsRow")}
            subtitle={
              registrationsCount === undefined
                ? undefined
                : registrationsCount
                  ? t("admin.home.waiting", { count: registrationsCount })
                  : t("admin.home.nothingPending")
            }
            badge={registrationsCount}
            onPress={openRegistrations}
          />
          <AdminToolRow
            grouped="next"
            icon="account-check-outline"
            title={t("admin.home.enrolStudentRow")}
            subtitle={t("admin.home.enrolStudentSubtitle")}
            onPress={openEnrolStudent}
          />
          <AdminToolRow
            grouped="next"
            icon="account-off-outline"
            title={t("admin.home.removedAccountsRow")}
            subtitle={
              removedAccountsCount === undefined
                ? undefined
                : removedAccountsCount
                  ? t("admin.home.removedAccountsCount", {
                      count: removedAccountsCount,
                    })
                  : t("admin.home.removedAccountsNone")
            }
            onPress={openRemovedAccounts}
          />
          <AdminToolRow
            grouped="next"
            icon="account-reactivate-outline"
            title={t("admin.home.reactivationsRow")}
            subtitle={
              reactivationsCount === undefined
                ? undefined
                : reactivationsCount
                  ? t("admin.home.waiting", { count: reactivationsCount })
                  : t("admin.home.nothingPending")
            }
            badge={reactivationsCount}
            onPress={openReactivations}
          />
        </View>
      </View>
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="ds-text-section-label text-ink-2"
        >
          {t("admin.home.schoolSection")}
        </Text>
        <View className="overflow-hidden rounded-card border border-line bg-surface">
          <TeachingClassesEntryRow
            role="admin"
            grouped="first"
            onPress={openMyClasses}
          />
          <SchoolRulesEntryRow
            role="admin"
            grouped="next"
            onPress={openSchoolRules}
          />
          <WeeklyOccupancyEntryRow
            grouped="next"
            onPress={openWeeklyOccupancy}
          />
          <AdminToolRow
            grouped="next"
            icon="calendar-remove-outline"
            title={t("admin.home.cancellationRulesRow")}
            subtitle={t("admin.home.cancellationRulesSubtitle")}
            onPress={openCancellationRules}
          />
          <AdminToolRow
            grouped="next"
            icon="bullhorn-outline"
            title={t("admin.home.sendNoticeRow")}
            subtitle={t("admin.home.sendNoticeSubtitle")}
            onPress={openSendNotice}
          />
          <AdminToolRow
            grouped="next"
            icon="tune-variant"
            title={t("admin.home.schoolSettingsRow")}
            onPress={openSchoolSettings}
          />
        </View>
      </View>
    </ScrollView>
  );
}
