import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { RefreshControl, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DecisionCard } from "@/components/decision/decision-card";
import { DenySheet } from "@/components/decision/deny-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { useTheme } from "@/hooks/use-theme";
import {
  StackHeaderTitle,
  useCollapsingTitleHeader,
  useHeaderInset,
} from "@/navigation/stack-header";
import { PersonAvatar } from "@/modules/people/components/person-avatar";
import { PersonSheet } from "@/modules/people/components/person-sheet";

import { RegistrationsSkeleton } from "../components/registrations-skeleton";
import { useReactivationsScreen } from "../hooks/use-reactivations-screen.hook";
import { formatReactivationDate } from "../utils/reactivation-date";

const DENY_REASON_MAX_LENGTH = 500;
const CONTENT_PADDING_TOP = 8;

/**
 * "Reactivate accounts" for admins: the deleted accounts asking to come back. The cards scroll under a collapsing title with the
 * intro; the loading, error and empty states don't scroll and keep the title in the header.
 */
export function ReactivationsScreen() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerInset = useHeaderInset();
  const {
    requests,
    status,
    isRetrying,
    isRefreshing,
    sending,
    denying,
    selected,
    isSheetVisible,
    openRequest,
    closeSheet,
    retry,
    refresh,
    approve,
    openDeny,
    closeDeny,
    confirmDeny,
  } = useReactivationsScreen();
  const header = useCollapsingTitleHeader({
    title: t("reactivations.title"),
    contentTop: CONTENT_PADDING_TOP,
  });

  return (
    <>
      {status === "ready" ? (
        <>
          <Stack.Screen options={header.headerOptions} />
          <Animated.FlatList
            testID="reactivations-list"
            className="flex-1 bg-page"
            contentInsetAdjustmentBehavior="automatic"
            data={requests}
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
                    <Ionicons
                      name="refresh-outline"
                      size={28}
                      color={theme.grape}
                    />
                  }
                  eyebrow={t("reactivations.waiting", {
                    count: requests.length,
                  })}
                  title={t("reactivations.title")}
                  description={t("reactivations.description")}
                  onTitleLayout={header.onTitleBottomChange}
                />
              </View>
            }
            renderItem={({ item }) => (
              <DecisionCard
                title={item.name}
                details={[
                  item.email,
                  t("reactivations.details", {
                    date: formatReactivationDate(item.deletedAt, language),
                    count: item.classesTaken,
                  }),
                ]}
                avatar={<PersonAvatar name={item.name} photoUrl={item.photoUrl} />}
                onPress={() => openRequest(item)}
                approveLabel={t("reactivations.approve")}
                denyLabel={t("reactivations.deny")}
                onApprove={() => approve(item)}
                onDeny={() => openDeny(item)}
                disabled={item.id in sending}
                loading={
                  sending[item.id] === "deny" ? undefined : sending[item.id]
                }
              />
            )}
          />
          {header.backdrop}
        </>
      ) : (
        <>
          <Stack.Screen
            options={{
              headerTitle: () => (
                <StackHeaderTitle title={t("reactivations.title")} />
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
            {status === "loading" ? <RegistrationsSkeleton /> : null}
            {status === "error" ? (
              <View className="flex-row">
                <ErrorState
                  title={t("reactivations.loadError.title")}
                  description={t("reactivations.loadError.description")}
                  onRetry={retry}
                  retrying={isRetrying}
                />
              </View>
            ) : null}
            {status === "empty" ? (
              <View className="flex-row">
                <EmptyState
                  icon="people-outline"
                  title={t("reactivations.empty.title")}
                  description={t("reactivations.empty.description")}
                />
              </View>
            ) : null}
          </View>
        </>
      )}
      <DenySheet
        visible={denying !== null}
        title={t("reactivations.denySheet.title")}
        hint={t("reactivations.denySheet.hint", { name: denying?.name ?? "" })}
        label={t("reactivations.denySheet.label")}
        placeholder={t("reactivations.denySheet.placeholder")}
        backLabel={t("registrations.denySheet.back")}
        confirmLabel={t("reactivations.denySheet.confirm")}
        maxLength={DENY_REASON_MAX_LENGTH}
        loading={denying !== null && denying.id in sending}
        onConfirm={confirmDeny}
        onClose={closeDeny}
      />
      <PersonSheet
        // A deleted account's WhatsApp number is not shown.
        person={
          selected && {
            name: selected.name,
            photoUrl: selected.photoUrl,
            role: selected.role,
            whatsappNumber: null,
          }
        }
        email={selected?.email}
        visible={isSheetVisible}
        onClose={closeSheet}
      />
    </>
  );
}
