import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DecidedList } from "@/components/decision/decided-list";
import { DecisionCard } from "@/components/decision/decision-card";
import { DenySheet } from "@/components/decision/deny-sheet";
import { Button } from "@/components/ui/button";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { useTheme } from "@/hooks/use-theme";
import type { AppLocale } from "@/i18n/locales";
import { formatCreatedAt } from "@/utils/format-created-at";
import { getInitials } from "@/utils/get-initials";

import { useRegistrationsScreen } from "../hooks/use-registrations-screen.hook";
import { Registration } from "../registrations.types";

const DENY_REASON_MAX_LENGTH = 500;

export function RegistrationsScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    registrations,
    isLoading,
    isError,
    isRefreshing,
    sending,
    decided,
    denying,
    retry,
    refresh,
    approve,
    openDeny,
    closeDeny,
    confirmDeny,
  } = useRegistrationsScreen();

  const askedLabel = (registration: Registration) => {
    const label = formatCreatedAt(
      registration.createdAt,
      new Date(),
      i18n.language as AppLocale,
    );

    if (!label) {
      return null;
    }

    return label.type === "now"
      ? t("registrations.askedNow")
      : t("registrations.asked", { time: label.text });
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <ActivityIndicator
          testID="registrations-loading"
          accessibilityRole="progressbar"
          color={theme.ink2}
        />
      );
    }

    if (isError) {
      return (
        <View className="items-center gap-3">
          <Text className="ds-text-body text-center text-ink-2">
            {t("registrations.loadError")}
          </Text>
          <Button variant="outline" onPress={retry}>
            {t("registrations.retry")}
          </Button>
        </View>
      );
    }

    return (
      <Text className="ds-text-body text-center text-ink-2">
        {t("registrations.empty")}
      </Text>
    );
  };

  return (
    <View className="flex-1 bg-page">
      <FlatList
        testID="registrations-list"
        contentInsetAdjustmentBehavior="automatic"
        data={registrations}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 px-screen"
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 24),
        }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
        }
        ListHeaderComponent={
          <View className="mb-3 items-start gap-6">
            <ScreenIntro
              icon={
                <MaterialCommunityIcons
                  name="account-check-outline"
                  size={30}
                  color={theme.grape}
                />
              }
              title={t("registrations.title")}
              description={t("registrations.description")}
            />
          </View>
        }
        renderItem={({ item }) => (
          <DecisionCard
            title={item.name}
            details={[item.email, askedLabel(item)].filter(
              (detail): detail is string => detail !== null,
            )}
            initials={getInitials(item.name)}
            approveLabel={t("registrations.approve")}
            denyLabel={t("registrations.deny")}
            onApprove={() => approve(item)}
            onDeny={() => openDeny(item)}
            disabled={item.id in sending}
            loading={sending[item.id] === "deny" ? undefined : sending[item.id]}
          />
        )}
        ListEmptyComponent={<View className="py-6">{renderEmpty()}</View>}
        ListFooterComponent={
          <View className="mt-3">
            <DecidedList title={t("decision.decidedJustNow")} items={decided} />
          </View>
        }
      />
      <DenySheet
        visible={denying !== null}
        title={t("registrations.denySheet.title", {
          name: denying?.name ?? "",
        })}
        hint={t("registrations.denySheet.hint")}
        label={t("registrations.denySheet.label")}
        confirmLabel={t("registrations.denySheet.confirm")}
        maxLength={DENY_REASON_MAX_LENGTH}
        loading={denying !== null && denying.id in sending}
        onConfirm={confirmDeny}
        onClose={closeDeny}
      />
    </View>
  );
}
