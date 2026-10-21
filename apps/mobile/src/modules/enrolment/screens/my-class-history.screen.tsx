import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { ClassCard } from "@/modules/classes/components/class-card";
import { StackHeaderTitle } from "@/navigation/stack-header";

import { useMyClassHistoryScreen } from "./my-class-history.screen.hook";

/** "Histórico": the classes the student took, newest first, 20 more at the end of the list. */
export function MyClassHistoryScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const screen = useMyClassHistoryScreen();

  const renderEmpty = () => {
    if (screen.isLoading) {
      return (
        <ActivityIndicator testID="my-history-loading" color={theme.grape} className="py-8" />
      );
    }

    if (screen.isError) {
      return (
        <View className="items-center gap-3 py-8">
          <Text className="ds-text-body text-center text-ink-2">{t("myHistory.loadError")}</Text>
          <Button variant="outline" onPress={screen.retry}>
            {t("myClasses.retry")}
          </Button>
        </View>
      );
    }

    // Nothing after an expired session: it is handled once, centrally.
    if (!screen.isEmpty) {
      return null;
    }

    return (
      <View className="items-center rounded-card border border-line bg-surface p-6">
        <Text className="ds-text-body text-center text-ink-2">{t("myHistory.empty")}</Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{ headerTitle: () => <StackHeaderTitle title={t("myHistory.title")} /> }}
      />
      <FlatList
        testID="my-history-list"
        className="flex-1 bg-page"
        data={screen.classes}
        keyExtractor={(item) => item.id}
        // On iOS the safe areas and the header are added by the scroll view.
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-3 px-screen"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: Math.max(insets.bottom, 24) }}
        refreshControl={
          <RefreshControl refreshing={screen.isRefreshing} onRefresh={screen.refresh} />
        }
        renderItem={({ item }) => (
          <ClassCard item={item} now={screen.now} onPress={screen.openClass} />
        )}
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={
          screen.isFetchingNextPage ? (
            <ActivityIndicator
              testID="my-history-loading-more"
              color={theme.grape}
              className="py-4"
            />
          ) : null
        }
        onEndReached={screen.loadMore}
        onEndReachedThreshold={0.5}
      />
    </>
  );
}
