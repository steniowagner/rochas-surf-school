import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { RefreshControl, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DenySheet } from "@/components/decision/deny-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { DisciplineFilter } from "@/modules/classes/components/discipline-filter";
import { DISCIPLINE_FILTER_CLEARANCE } from "@/modules/classes/components/discipline-filter/discipline-filter.constants";
import { PersonSheet } from "@/modules/people/components/person-sheet";
import { useTheme } from "@/hooks/use-theme";
import {
  StackHeaderTitle,
  useCollapsingTitleHeader,
  useHeaderInset,
} from "@/navigation/stack-header";

import { ClassRequestsGroup } from "../components/class-requests-group";
import { ClassRequestsSkeleton } from "../components/class-requests-skeleton";
import { useClassRequestsScreen } from "../hooks/use-class-requests-screen.hook";

const DENY_REASON_MAX_LENGTH = 500;
const CONTENT_PADDING_TOP = 8;

/**
 * "Class enrolments" for admins: the pending requests, grouped by class. The groups scroll under a collapsing title
 * with the intro; the loading, error and empty states don't scroll and keep the title in the header.
 */
export function ClassRequestsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerInset = useHeaderInset();
  const {
    classes,
    total,
    status,
    isRetrying,
    isRefreshing,
    sending,
    denying,
    retry,
    refresh,
    approve,
    openDeny,
    closeDeny,
    confirmDeny,
    student,
    studentVisible,
    discipline,
    selectDiscipline,
    openClass,
    openStudent,
    closeStudent,
  } = useClassRequestsScreen();
  const header = useCollapsingTitleHeader({
    title: t("classRequests.title"),
    contentTop: CONTENT_PADDING_TOP,
  });

  return (
    <View className="flex-1">
      {status === "ready" ? (
        <>
          <Stack.Screen options={header.headerOptions} />
          <Animated.FlatList
            testID="class-requests-list"
            className="flex-1 bg-page"
            contentInsetAdjustmentBehavior="automatic"
            data={classes}
            keyExtractor={(item) => item.id}
            contentContainerClassName="gap-6 px-screen"
            contentContainerStyle={{
              paddingTop: CONTENT_PADDING_TOP,
              paddingBottom:
                Math.max(insets.bottom, 24) + DISCIPLINE_FILTER_CLEARANCE,
            }}
            onScroll={header.scrollHandler}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
            }
            ListHeaderComponent={
              <ScreenIntro
                icon={
                  <Ionicons
                    name="people-outline"
                    size={28}
                    color={theme.grape}
                  />
                }
                eyebrow={`${t("classRequests.requestsCount", { count: total })} · ${t("classRequests.classesCount", { count: classes.length })}`}
                title={t("classRequests.title")}
                description={t("classRequests.description")}
                onTitleLayout={header.onTitleBottomChange}
              />
            }
            ListEmptyComponent={
              discipline === "all" ? null : (
                <View className="flex-row">
                  <EmptyState
                    icon="checkmark-done-outline"
                    title={t(`classRequests.emptyFiltered.${discipline}.title`)}
                    description={t(
                      `classRequests.emptyFiltered.${discipline}.description`,
                    )}
                  />
                </View>
              )
            }
            renderItem={({ item }) => (
              <ClassRequestsGroup
                item={item}
                sending={sending}
                onApprove={approve}
                onDeny={openDeny}
                onOpenClass={openClass}
                onOpenStudent={openStudent}
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
                <StackHeaderTitle title={t("classRequests.title")} />
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
            {status === "loading" ? <ClassRequestsSkeleton /> : null}
            {status === "error" ? (
              <View className="flex-row">
                <ErrorState
                  title={t("classRequests.loadError.title")}
                  description={t("classRequests.loadError.description")}
                  onRetry={retry}
                  retrying={isRetrying}
                />
              </View>
            ) : null}
            {status === "empty" ? (
              <View className="flex-row">
                <EmptyState
                  icon="checkmark-done-outline"
                  title={t("classRequests.empty.title")}
                  description={t("classRequests.empty.description")}
                />
              </View>
            ) : null}
          </View>
        </>
      )}
      <DisciplineFilter value={discipline} onChange={selectDiscipline} />
      <DenySheet
        visible={denying !== null}
        title={t("classRequests.denySheet.title")}
        hint={t("classRequests.denySheet.hint", {
          name: denying?.student.name ?? "",
        })}
        label={t("classRequests.denySheet.label")}
        placeholder={t("classRequests.denySheet.placeholder")}
        backLabel={t("classRequests.denySheet.back")}
        confirmLabel={t("classRequests.denySheet.confirm")}
        maxLength={DENY_REASON_MAX_LENGTH}
        loading={denying !== null && denying.id in sending}
        onConfirm={confirmDeny}
        onClose={closeDeny}
      />
      <PersonSheet
        // The pending requests don't carry the WhatsApp number, and only students ask for a seat.
        person={
          student && {
            name: student.student.name,
            role: "student",
            whatsappNumber: null,
          }
        }
        visible={studentVisible}
        onClose={closeStudent}
      />
    </View>
  );
}
