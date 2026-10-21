import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ClassCard } from "@/modules/classes/components/class-card";

import { MyClassesFilters } from "../components/my-classes-filters";

import { useMyClassesScreen } from "./my-classes.screen.hook";

/** The student's "Minhas aulas" tab: every class they asked for that hasn't finished, by status. */
export function MyClassesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const screen = useMyClassesScreen();

  const renderEmpty = () => {
    if (screen.isLoading) {
      return (
        <ActivityIndicator testID="my-classes-loading" color={theme.grape} className="py-8" />
      );
    }

    if (screen.isError) {
      return (
        <View className="items-center gap-3 py-8">
          <Text className="ds-text-body text-center text-ink-2">{t("myClasses.loadError")}</Text>
          <Button variant="outline" onPress={screen.retry}>
            {t("myClasses.retry")}
          </Button>
        </View>
      );
    }

    if (!screen.isEmpty) {
      return null;
    }

    return (
      <View className="items-center gap-2 rounded-card border border-line bg-surface p-6">
        <Text className="ds-text-list-title text-center text-ink">{t("myClasses.empty.title")}</Text>
        <Text className="ds-text-body text-center text-ink-2">{t(screen.emptyKey)}</Text>
      </View>
    );
  };

  return (
    <FlatList
      testID="my-classes-list"
      className="flex-1 bg-page"
      data={screen.items}
      keyExtractor={(item) => item.id}
      contentContainerClassName="gap-3 px-screen"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: Math.max(insets.bottom, 24),
      }}
      refreshControl={<RefreshControl refreshing={screen.isRefreshing} onRefresh={screen.refresh} />}
      ListHeaderComponent={
        <View className="gap-4 pb-1">
          <View className="flex-row items-center justify-between gap-4">
            <Text accessibilityRole="header" className="ds-text-screen-title flex-1 text-ink">
              {t("myClasses.title")}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("myClasses.history")}
              activeOpacity={BUTTON_ACTIVE_OPACITY}
              onPress={screen.openHistory}
              style={shadowStyle("iconButton", theme)}
              className="h-11 w-11 items-center justify-center rounded-full bg-surface"
            >
              <Ionicons name="time-outline" size={22} color={theme.ink} />
            </TouchableOpacity>
          </View>
          <MyClassesFilters selected={screen.filter} onSelect={screen.selectFilter} />
        </View>
      }
      renderItem={({ item }) => (
        <ClassCard item={item} now={screen.now} onPress={screen.openClass} showEnrolment />
      )}
      ListEmptyComponent={renderEmpty()}
    />
  );
}
