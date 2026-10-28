import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, RefreshControl, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { TextInput } from "@/components/ui/text-input";
import { useTheme } from "@/hooks/use-theme";
import { useCollapsingTitleHeader } from "@/navigation/stack-header";

import { PeopleSkeleton } from "../components/people-skeleton";
import { PersonRow } from "../components/person-row";
import { PersonSheet } from "../components/person-sheet";
import { RoleFilters } from "../components/role-filters";
import { usePeopleScreen } from "../hooks/use-people-screen.hook";
import { groupByInitial } from "../utils/group-by-initial";

const CONTENT_PADDING_TOP = 8;

/**
 * The directory of the platform for admins and instructors. The intro, the search and the role filters scroll with the
 * list, so the title collapses into the header; the search stays mounted through every state, so typing never loses
 * focus, and the loading, error and empty states sit right under it.
 */
export function PeopleScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    count,
    people,
    searchText,
    setSearchText,
    roles,
    toggleRole,
    isLoading,
    isError,
    isEmpty,
    isFetchingNextPage,
    isRefreshing,
    isRetrying,
    retry,
    refresh,
    loadMore,
    selectedPerson,
    canChangeRole,
    canSetInstructorFlag,
    isSheetVisible,
    openPerson,
    closeSheet,
  } = usePeopleScreen();
  const header = useCollapsingTitleHeader({
    title: t("people.title"),
    contentTop: CONTENT_PADDING_TOP,
  });

  const renderEmpty = () => {
    if (isLoading) {
      return <PeopleSkeleton />;
    }

    if (isError) {
      return (
        <View className="flex-row pt-4">
          <ErrorState
            title={t("people.loadError.title")}
            description={t("people.loadError.description")}
            onRetry={retry}
            retrying={isRetrying}
          />
        </View>
      );
    }

    // Neither the error nor "no one found" after an expired session: it is handled once, centrally.
    if (!isEmpty) {
      return null;
    }

    return (
      <View className="flex-row pt-4">
        <EmptyState
          icon="people-outline"
          title={t("people.empty.title")}
          description={t("people.empty.description")}
        />
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={header.headerOptions} />
      <Animated.FlatList
        testID="people-list"
        className="flex-1 bg-page"
        data={groupByInitial(people)}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        // On iOS the safe areas, the header and the floating tab bar are added by the scroll view.
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-screen"
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
          <View className="gap-4 pb-3">
            <ScreenIntro
              icon={
                <Ionicons name="people-outline" size={28} color={theme.grape} />
              }
              eyebrow={
                count !== undefined ? t("people.count", { count }) : undefined
              }
              title={t("people.title")}
              description={t("people.description")}
              onTitleLayout={header.onTitleBottomChange}
            />
            <TextInput
              icon={<Ionicons name="search" size={20} color={theme.ink2} />}
              value={searchText}
              onChangeText={setSearchText}
              placeholder={t("people.searchPlaceholder")}
              accessibilityLabel={t("people.searchPlaceholder")}
              clearable
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            <RoleFilters roles={roles} onToggle={toggleRole} />
          </View>
        }
        renderItem={({ item }) =>
          item.kind === "header" ? (
            <Text
              accessibilityRole="header"
              className="ds-text-section-label mb-2 mt-4 text-ink"
            >
              {item.letter}
            </Text>
          ) : (
            <PersonRow
              person={item.person}
              onPress={openPerson}
              isFirst={item.isFirst}
              isLast={item.isLast}
            />
          )
        }
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator
              testID="people-loading-more"
              accessibilityRole="progressbar"
              color={theme.ink2}
              className="py-4"
            />
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />
      {header.backdrop}
      <PersonSheet
        person={selectedPerson}
        canChangeRole={canChangeRole}
        canSetInstructorFlag={canSetInstructorFlag}
        visible={isSheetVisible}
        onClose={closeSheet}
      />
    </>
  );
}
