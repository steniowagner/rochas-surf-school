import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DecisionCard } from "@/components/decision/decision-card";
import { DenySheet } from "@/components/decision/deny-sheet";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { PersonAvatar } from "@/modules/people/components/person-avatar";
import { PersonSheet } from "@/modules/people/components/person-sheet";

import { useRegistrationsScreen } from "../hooks/use-registrations-screen.hook";
import { Registration } from "../registrations.types";

const DENY_REASON_MAX_LENGTH = 500;

export function RegistrationsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    registrations,
    isLoading,
    isError,
    isRefreshing,
    sending,
    denying,
    selected,
    isSheetVisible,
    openRegistration,
    closeSheet,
    retry,
    refresh,
    approve,
    openDeny,
    closeDeny,
    confirmDeny,
  } = useRegistrationsScreen();

  const showCount = !isLoading && !isError && registrations.length > 0;

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
          paddingTop: 24,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
        }
        ListHeaderComponent={
          <View className="mb-3 gap-2">
            <View className="gap-1">
              {showCount ? (
                <Text className="ds-text-section-label text-ink-2">
                  {t("registrations.waiting", { count: registrations.length })}
                </Text>
              ) : null}
              <Text
                accessibilityRole="header"
                className="ds-text-screen-title text-ink"
              >
                {t("registrations.title")}
              </Text>
            </View>
            <Text className="ds-text-body text-ink-2">
              {t("registrations.description")}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <DecisionCard
            title={item.name}
            details={[item.email]}
            avatar={<PersonAvatar name={item.name} />}
            onPress={() => openRegistration(item)}
            approveLabel={t("registrations.approve")}
            denyLabel={t("registrations.deny")}
            onApprove={() => approve(item)}
            onDeny={() => openDeny(item)}
            disabled={item.id in sending}
            loading={sending[item.id] === "deny" ? undefined : sending[item.id]}
          />
        )}
        ListEmptyComponent={<View className="py-6">{renderEmpty()}</View>}
      />
      <DenySheet
        visible={denying !== null}
        title={t("registrations.denySheet.title")}
        hint={t("registrations.denySheet.hint", { name: denying?.name ?? "" })}
        label={t("registrations.denySheet.label")}
        placeholder={t("registrations.denySheet.placeholder")}
        backLabel={t("registrations.denySheet.back")}
        confirmLabel={t("registrations.denySheet.confirm")}
        maxLength={DENY_REASON_MAX_LENGTH}
        loading={denying !== null && denying.id in sending}
        onConfirm={confirmDeny}
        onClose={closeDeny}
      />
      <PersonSheet
        // A registration is always a pending student with no WhatsApp number yet.
        person={
          selected && {
            id: selected.id,
            name: selected.name,
            role: "student",
            createdAt: selected.createdAt,
            whatsappNumber: null,
          }
        }
        email={selected?.email}
        visible={isSheetVisible}
        onClose={closeSheet}
      />
    </View>
  );
}
