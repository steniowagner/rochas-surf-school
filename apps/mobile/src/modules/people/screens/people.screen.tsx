import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { useTheme } from "@/hooks/use-theme";

import { FilterBar } from "../components/filter-bar";
import { FilterSheet } from "../components/filter-sheet";
import { PersonRow } from "../components/person-row";
import { PersonSheet } from "../components/person-sheet";
import { usePeopleScreen } from "../hooks/use-people-screen.hook";

import { PeopleScreenProps } from "./people.screen.types";

export function PeopleScreen({ showBackButton }: PeopleScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    count,
    people,
    searchText,
    setSearchText,
    roleFilter,
    setRoleFilter,
    sort,
    setSort,
    isFilterVisible,
    openFilter,
    closeFilter,
    isLoading,
    isError,
    isEmpty,
    isFetchingNextPage,
    isRefreshing,
    retry,
    refresh,
    loadMore,
    selectedPerson,
    isSheetVisible,
    openPerson,
    closeSheet,
  } = usePeopleScreen();

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <ActivityIndicator
          testID="people-loading"
          accessibilityRole="progressbar"
          color={theme.ink2}
        />
      );
    }

    if (isError) {
      return (
        <View className="items-center gap-3">
          <Text className="ds-text-body text-center text-ink-2">
            {t("people.loadError")}
          </Text>
          <Button variant="outline" onPress={retry}>
            {t("registrations.retry")}
          </Button>
        </View>
      );
    }

    // Neither the error nor "no one found" after an expired session: it is handled once, centrally.
    if (!isEmpty) {
      return null;
    }

    return (
      <Text className="ds-text-body text-center text-ink-2">
        {t("people.empty")}
      </Text>
    );
  };

  return (
    <View className="flex-1 bg-page">
      <FlatList
        testID="people-list"
        data={people}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        // On iOS the safe areas and the floating tab bar of a tab root are added by the scroll view.
        contentInsetAdjustmentBehavior={showBackButton ? "never" : "automatic"}
        contentContainerClassName="px-screen"
        contentContainerStyle={{
          paddingTop: showBackButton
            ? insets.top + 12
            : Platform.OS === "android"
              ? insets.top + 24
              : 24,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
        }
        ListHeaderComponent={
          <View className="mb-3 gap-4">
            {showBackButton ? (
              <View className="items-start">
                <BackButton />
              </View>
            ) : null}
            <View className="gap-1">
              {count !== undefined ? (
                <Text className="ds-text-section-label text-ink-2">
                  {t("people.count", { count })}
                </Text>
              ) : null}
              <Text
                accessibilityRole="header"
                className="ds-text-screen-title text-ink"
              >
                {t("people.title")}
              </Text>
            </View>
            <TextInput
              icon={<Ionicons name="search" size={20} color={theme.ink2} />}
              value={searchText}
              onChangeText={setSearchText}
              placeholder={t("people.searchPlaceholder")}
              accessibilityLabel={t("people.searchPlaceholder")}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            <FilterBar
              role={roleFilter}
              sort={sort}
              onOpen={openFilter}
              onClearRole={() => setRoleFilter("all")}
              onClearSort={() => setSort("recent")}
            />
          </View>
        }
        renderItem={({ item, index }) => (
          <PersonRow
            person={item}
            onPress={openPerson}
            isFirst={index === 0}
            isLast={index === people.length - 1}
          />
        )}
        ListEmptyComponent={<View className="py-6">{renderEmpty()}</View>}
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
      <FilterSheet
        visible={isFilterVisible}
        onClose={closeFilter}
        role={roleFilter}
        sort={sort}
        onRoleChange={setRoleFilter}
        onSortChange={setSort}
      />
      <PersonSheet
        person={selectedPerson}
        visible={isSheetVisible}
        onClose={closeSheet}
      />
    </View>
  );
}
