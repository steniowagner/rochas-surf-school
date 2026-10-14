import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenIntro } from "@/components/ui/screen-intro";
import { routes } from "@/constants/routes";
import { useTheme } from "@/hooks/use-theme";

import { PeopleEntryRow } from "@/modules/people/components/people-entry-row";

import { useRegistrations } from "../hooks/use-registrations.hook";

const openRegistrations = () => router.push(routes.admin.registrations);
const openPeople = () => router.push(routes.admin.people);

export function AdminScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data } = useRegistrations();

  // The count shows once loaded (zero included); while loading or after an error the row has none.
  const count = data?.items.length;

  return (
    <View
      className="flex-1 gap-6 bg-page px-screen"
      style={{
        paddingTop: insets.top + 12,
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
        </View>
      </View>
      <View className="gap-2">
        <Text className="ds-text-section-label text-ink-2">
          {t("admin.home.schoolSection")}
        </Text>
        <PeopleEntryRow onPress={openPeople} />
      </View>
    </View>
  );
}
