import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { HeaderButton } from "@/components/ui/header-button";
import { useTheme } from "@/hooks/use-theme";
import { ClassCard } from "@/modules/classes/components/class-card";
import {
  StackHeaderTitle,
  useLeftTitleHeader,
} from "@/navigation/stack-header";

import { MyClassesFilters } from "../components/my-classes-filters";

import { useMyClassesScreen } from "./my-classes.screen.hook";

/** The student's "Minhas aulas" tab: every class they asked for that hasn't finished, by status. */
export function MyClassesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const screen = useMyClassesScreen();
  const headerOptions = useLeftTitleHeader(() => (
    <StackHeaderTitle title={t("myClasses.title")} />
  ));

  const renderEmpty = () => {
    if (screen.isLoading) {
      return (
        <ActivityIndicator
          testID="my-classes-loading"
          color={theme.grape}
          className="py-8"
        />
      );
    }

    if (screen.isError) {
      return (
        <View className="items-center gap-3 py-8">
          <Text className="ds-text-body text-center text-ink-2">
            {t("myClasses.loadError")}
          </Text>
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
        <Text className="ds-text-list-title text-center text-ink">
          {t("myClasses.empty.title")}
        </Text>
        <Text className="ds-text-body text-center text-ink-2">
          {t(screen.emptyKey)}
        </Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          ...headerOptions,
          headerRight: () => (
            <HeaderButton
              icon="time-outline"
              label={t("myClasses.history")}
              onPress={screen.openHistory}
            />
          ),
        }}
      />
      <FlatList
        testID="my-classes-list"
        className="flex-1 bg-page"
        data={screen.items}
        keyExtractor={(item) => item.id}
        // On iOS the safe areas, the header and the floating tab bar are added by the scroll view.
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-3 px-screen"
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
        refreshControl={
          <RefreshControl
            refreshing={screen.isRefreshing}
            onRefresh={screen.refresh}
          />
        }
        ListHeaderComponent={
          <View className="gap-4 pb-1">
            <MyClassesFilters
              selected={screen.filter}
              onSelect={screen.selectFilter}
            />
          </View>
        }
        renderItem={({ item }) => (
          <ClassCard
            item={item}
            now={screen.now}
            onPress={screen.openClass}
            showEnrolment
          />
        )}
        ListEmptyComponent={renderEmpty()}
      />
    </>
  );
}
