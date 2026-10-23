import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { HeaderButton } from "@/components/ui/header-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/hooks/use-theme";
import { StackHeaderTitle } from "@/navigation/stack-header";

import { NotificationRow } from "../components/notification-row";

import { useNotificationsScreen } from "./notifications.screen.hook";

const LOADING_ROWS = [0, 1, 2, 3, 4];

/**
 * "Avisos": every notification of the person, newest first, each read or unread. Tapping one marks it read and opens
 * what it is about; the header's button marks them all read (spec 055).
 */
export function NotificationsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const screen = useNotificationsScreen();

  const renderEmpty = () => {
    if (screen.isLoading) {
      // Rows shaped like notifications, read out as one loading state.
      return (
        <View
          testID="notifications-loading"
          accessible
          accessibilityLabel={t("notifications.loading")}
          className="gap-card-gap"
        >
          {LOADING_ROWS.map((key) => (
            <View key={key} className="flex-row gap-3 rounded-card bg-surface p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-3.5 w-1/2 rounded-full" />
                <Skeleton className="h-3 w-5/6 rounded-full" />
                <Skeleton className="h-3 w-1/4 rounded-full" />
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (screen.isError) {
      return (
        <View className="flex-row pt-4">
          <ErrorState
            title={t("notifications.loadError.title")}
            description={t("notifications.loadError.description")}
            onRetry={screen.retry}
            retrying={screen.isRetrying}
          />
        </View>
      );
    }

    // Nothing after an expired session: it is handled once, centrally.
    if (!screen.isEmpty) {
      return null;
    }

    return (
      <View className="flex-row pt-4">
        <EmptyState
          icon="notifications-outline"
          title={t("notifications.empty.title")}
          description={t("notifications.empty.description")}
        />
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => <StackHeaderTitle title={t("notifications.title")} />,
          headerRight: screen.showMarkAll
            ? () => (
                <HeaderButton
                  icon="checkmark-done-outline"
                  label={t("notifications.markAll")}
                  onPress={screen.markAllRead}
                />
              )
            : undefined,
        }}
      />
      <FlatList
        testID="notifications-list"
        className="flex-1 bg-page"
        data={screen.notifications}
        keyExtractor={(notification) => notification.id}
        // On iOS the safe areas and the header are added by the scroll view.
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-card-gap px-screen"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: Math.max(insets.bottom, 24) }}
        refreshControl={
          <RefreshControl refreshing={screen.isRefreshing} onRefresh={screen.refresh} />
        }
        renderItem={({ item }) => (
          <NotificationRow notification={item} now={screen.now} onPress={screen.openNotification} />
        )}
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={
          screen.isFetchingNextPage ? (
            <ActivityIndicator
              testID="notifications-loading-more"
              accessibilityRole="progressbar"
              color={theme.ink2}
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
