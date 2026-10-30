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
import { useRegistrationsScreen } from "../hooks/use-registrations-screen.hook";

const DENY_REASON_MAX_LENGTH = 500;
const CONTENT_PADDING_TOP = 8;

/**
 * "Join the school" for admins: the accounts waiting for approval. The cards scroll under a collapsing title with the
 * intro; the loading, error and empty states don't scroll and keep the title in the header.
 */
export function RegistrationsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerInset = useHeaderInset();
  const {
    registrations,
    status,
    isRetrying,
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
  const header = useCollapsingTitleHeader({
    title: t("registrations.title"),
    contentTop: CONTENT_PADDING_TOP,
  });

  return (
    <>
      {status === "ready" ? (
        <>
          <Stack.Screen options={header.headerOptions} />
          <Animated.FlatList
            testID="registrations-list"
            className="flex-1 bg-page"
            contentInsetAdjustmentBehavior="automatic"
            data={registrations}
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
                      name="person-add-outline"
                      size={28}
                      color={theme.grape}
                    />
                  }
                  eyebrow={t("registrations.waiting", {
                    count: registrations.length,
                  })}
                  title={t("registrations.title")}
                  description={t("registrations.description")}
                  onTitleLayout={header.onTitleBottomChange}
                />
              </View>
            }
            renderItem={({ item }) => (
              <DecisionCard
                title={item.name}
                details={[item.email]}
                avatar={<PersonAvatar name={item.name} photoUrl={item.photoUrl} />}
                onPress={() => openRegistration(item)}
                approveLabel={t("registrations.approve")}
                denyLabel={t("registrations.deny")}
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
                <StackHeaderTitle title={t("registrations.title")} />
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
                  title={t("registrations.loadError.title")}
                  description={t("registrations.loadError.description")}
                  onRetry={retry}
                  retrying={isRetrying}
                />
              </View>
            ) : null}
            {status === "empty" ? (
              <View className="flex-row">
                <EmptyState
                  icon="people-outline"
                  title={t("registrations.empty.title")}
                  description={t("registrations.empty.description")}
                />
              </View>
            ) : null}
          </View>
        </>
      )}
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
            name: selected.name,
            photoUrl: selected.photoUrl,
            role: "student",
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
