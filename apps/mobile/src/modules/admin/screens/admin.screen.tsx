import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenIntro } from "@/components/ui/screen-intro";
import { routes } from "@/constants/routes";
import { useTheme } from "@/hooks/use-theme";
import { usePendingRequests } from "@/modules/enrolment/hooks/use-pending-requests.hook";
import { PeopleEntryRow } from "@/modules/people/components/people-entry-row";
import { SchoolRulesEntryRow } from "@/modules/school-rules/components/school-rules-entry-row";
import { useHeaderInset } from "@/navigation/stack-header";

import { useRegistrations } from "../hooks/use-registrations.hook";

const openRegistrations = () => router.push(routes.admin.registrations);
const openClassRequests = () => router.push(routes.admin.classRequests);
const openEnrolStudent = () => router.push(routes.admin.enrolStudent);
const openPeople = () => router.push(routes.admin.people);
const openNewClass = () => router.push(routes.admin.newClass());
const openSchoolSettings = () => router.push(routes.admin.schoolSettings);
const openCancellationRules = () => router.push(routes.admin.cancellationRules);
const openSchoolRules = () => router.push(routes.admin.manageSchoolRules);

export function AdminScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerInset = useHeaderInset();
  const { data } = useRegistrations();
  const { data: pendingRequests } = usePendingRequests();

  // The count shows once loaded (zero included); while loading or after an error the row has none.
  const count = data?.items.length;
  // The requests' row shows its count only while some are waiting.
  const requestsCount = pendingRequests?.total;

  return (
    <View
      className="flex-1 gap-6 bg-page px-screen"
      style={{
        // Clears the user header, which the tab's stack draws above the screen.
        paddingTop: headerInset + 16,
        paddingBottom: Math.max(insets.bottom, 24),
      }}
    >
      <ScreenIntro
        icon={
          <MaterialCommunityIcons
            name="toolbox-outline"
            size={30}
            color={theme.grape}
          />
        }
        title={t("admin.home.title")}
        description={null}
      />
      <View className="gap-2">
        <Text className="ds-text-section-label text-ink-2">
          {t("admin.home.toolsSection")}
        </Text>
        <View className="rounded-card border border-line bg-surface px-4">
          <Pressable
            accessibilityRole="button"
            onPress={openRegistrations}
            className="min-h-11 flex-row items-center gap-3 py-3"
          >
            <Text className="ds-text-list-title flex-1 text-ink">
              {t("admin.home.registrationsRow")}
            </Text>
            {count !== undefined ? (
              <Text className="ds-text-list-subtitle text-ink-2">
                {t("admin.home.waiting", { count })}
              </Text>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={theme.ink2} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={openClassRequests}
            className="min-h-11 flex-row items-center gap-3 border-t border-line py-3"
          >
            <Text className="ds-text-list-title flex-1 text-ink">
              {t("admin.home.classRequestsRow")}
            </Text>
            {requestsCount ? (
              <Text className="ds-text-list-subtitle text-ink-2">
                {t("admin.home.classRequestsCount", { count: requestsCount })}
              </Text>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={theme.ink2} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={openEnrolStudent}
            className="min-h-11 flex-row items-center gap-3 border-t border-line py-3"
          >
            <Text className="ds-text-list-title flex-1 text-ink">
              {t("admin.home.enrolStudentRow")}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.ink2} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={openNewClass}
            className="min-h-11 flex-row items-center gap-3 border-t border-line py-3"
          >
            <Text className="ds-text-list-title flex-1 text-ink">
              {t("admin.home.newClassRow")}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.ink2} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("admin.home.cancellationRulesRow")}
            onPress={openCancellationRules}
            className="min-h-11 flex-row items-center gap-3 border-t border-line py-3"
          >
            <View className="flex-1">
              <Text className="ds-text-list-title text-ink">
                {t("admin.home.cancellationRulesRow")}
              </Text>
              <Text className="ds-text-list-subtitle text-ink-2">
                {t("admin.home.cancellationRulesSubtitle")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.ink2} />
          </Pressable>
        </View>
      </View>
      <View className="gap-2">
        <Text className="ds-text-section-label text-ink-2">
          {t("admin.home.schoolSection")}
        </Text>
        <SchoolRulesEntryRow role="admin" onPress={openSchoolRules} />
        <PeopleEntryRow onPress={openPeople} />
        <View className="rounded-card border border-line bg-surface px-4">
          <Pressable
            accessibilityRole="button"
            onPress={openSchoolSettings}
            className="min-h-11 flex-row items-center gap-3 py-3"
          >
            <Ionicons name="settings-outline" size={20} color={theme.lagoon} />
            <Text className="ds-text-list-title flex-1 text-ink">
              {t("admin.home.schoolSettingsRow")}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.ink2} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
