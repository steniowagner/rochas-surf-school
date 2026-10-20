import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DenySheet } from "@/components/decision/deny-sheet";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { StackHeaderTitle, useLeftTitleHeader } from "@/navigation/stack-header";

import { ClassRequestsGroup } from "../components/class-requests-group";
import { useClassRequestsScreen } from "../hooks/use-class-requests-screen.hook";

const DENY_REASON_MAX_LENGTH = 500;

export function ClassRequestsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    classes,
    total,
    isLoading,
    isError,
    isRefreshing,
    sending,
    denying,
    retry,
    refresh,
    approve,
    openDeny,
    closeDeny,
    confirmDeny,
  } = useClassRequestsScreen();

  const showCount = !isLoading && !isError && classes.length > 0;
  const headerOptions = useLeftTitleHeader(() => (
    <StackHeaderTitle
      title={t("classRequests.title")}
      subtitle={
        showCount
          ? `${t("classRequests.requestsCount", { count: total })} · ${t("classRequests.classesCount", { count: classes.length })}`
          : undefined
      }
    />
  ));

  const renderEmpty = () => {
    if (isLoading) {
      return <ActivityIndicator testID="class-requests-loading" accessibilityRole="progressbar" color={theme.ink2} />;
    }

    if (isError) {
      return (
        <View className="items-center gap-3">
          <Text className="ds-text-body text-center text-ink-2">{t("classRequests.loadError")}</Text>
          <Button variant="outline" onPress={retry}>
            {t("classRequests.retry")}
          </Button>
        </View>
      );
    }

    return (
      <View className="items-center gap-1">
        <Text className="ds-text-list-title text-center text-ink">{t("classRequests.emptyTitle")}</Text>
        <Text className="ds-text-body text-center text-ink-2">{t("classRequests.emptyDescription")}</Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-page">
      <Stack.Screen options={headerOptions} />
      <FlatList
        testID="class-requests-list"
        contentInsetAdjustmentBehavior="automatic"
        data={classes}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-6 px-screen"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: Math.max(insets.bottom, 24) }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
        renderItem={({ item }) => (
          <ClassRequestsGroup item={item} sending={sending} onApprove={approve} onDeny={openDeny} />
        )}
        ListEmptyComponent={<View className="py-6">{renderEmpty()}</View>}
      />
      <DenySheet
        visible={denying !== null}
        title={t("classRequests.denySheet.title")}
        hint={t("classRequests.denySheet.hint", { name: denying?.student.name ?? "" })}
        label={t("classRequests.denySheet.label")}
        placeholder={t("classRequests.denySheet.placeholder")}
        backLabel={t("classRequests.denySheet.back")}
        confirmLabel={t("classRequests.denySheet.confirm")}
        maxLength={DENY_REASON_MAX_LENGTH}
        loading={denying !== null && denying.id in sending}
        onConfirm={confirmDeny}
        onClose={closeDeny}
      />
    </View>
  );
}
