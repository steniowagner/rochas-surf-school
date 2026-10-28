import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { RefreshControl, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { useTheme } from "@/hooks/use-theme";
import {
  StackHeaderTitle,
  useCollapsingTitleHeader,
  useHeaderInset,
} from "@/navigation/stack-header";

import { PersonSheet } from "../components/person-sheet";
import { RemovedAccountRow } from "../components/removed-account-row";
import { RemovedAccountsSkeleton } from "../components/removed-accounts-skeleton";
import { useRemovedAccountsScreen } from "../hooks/use-removed-accounts-screen.hook";

const CONTENT_PADDING_TOP = 8;

/**
 * "Removed accounts" for admins: the accounts removed in the last 30 days, each with Restore. The rows scroll under a
 * collapsing title with the intro; the loading, error and empty states don't scroll and keep the title in the header.
 */
export function RemovedAccountsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerInset = useHeaderInset();
  const {
    accounts,
    status,
    isRefreshing,
    isRetrying,
    selected,
    isSheetVisible,
    openAccount,
    closeSheet,
    restoringId,
    restore,
    retry,
    refresh,
  } = useRemovedAccountsScreen();
  const header = useCollapsingTitleHeader({
    title: t("removedAccounts.title"),
    contentTop: CONTENT_PADDING_TOP,
  });

  return status === "ready" ? (
    <>
      <Stack.Screen options={header.headerOptions} />
      <Animated.FlatList
        testID="removed-accounts-list"
        className="flex-1 bg-page"
        contentInsetAdjustmentBehavior="automatic"
        data={accounts}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 px-screen"
        contentContainerStyle={{
          paddingTop: CONTENT_PADDING_TOP,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
        onScroll={header.scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
        }
        ListHeaderComponent={
          <View className="mb-1">
            <ScreenIntro
              icon={
                <MaterialCommunityIcons
                  name="account-off-outline"
                  size={28}
                  color={theme.grape}
                />
              }
              eyebrow={t("removedAccounts.count", { count: accounts.length })}
              title={t("removedAccounts.title")}
              description={t("removedAccounts.description")}
              onTitleLayout={header.onTitleBottomChange}
            />
          </View>
        }
        renderItem={({ item }) => (
          <RemovedAccountRow
            account={item}
            onPress={openAccount}
            onRestore={restore}
            isRestoring={restoringId === item.id}
            disabled={restoringId !== null && restoringId !== item.id}
          />
        )}
      />
      {header.backdrop}
      <PersonSheet
        person={selected}
        visible={isSheetVisible}
        onClose={closeSheet}
      />
    </>
  ) : (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <StackHeaderTitle title={t("removedAccounts.title")} />
          ),
        }}
      />
      <View
        className={`flex-1 bg-page px-screen ${status === "loading" ? "" : "justify-center"}`}
        style={{
          paddingTop: headerInset + CONTENT_PADDING_TOP,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        {status === "loading" ? <RemovedAccountsSkeleton /> : null}
        {status === "error" ? (
          <View className="flex-row">
            <ErrorState
              title={t("removedAccounts.loadError.title")}
              description={t("removedAccounts.loadError.description")}
              onRetry={retry}
              retrying={isRetrying}
            />
          </View>
        ) : null}
        {status === "empty" ? (
          <View className="flex-row">
            <EmptyState
              icon="refresh-circle-outline"
              title={t("removedAccounts.empty.title")}
              description={t("removedAccounts.empty.description")}
            />
          </View>
        ) : null}
      </View>
    </>
  );
}
