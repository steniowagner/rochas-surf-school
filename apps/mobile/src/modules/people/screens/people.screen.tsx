import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Platform,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { useTheme } from "@/hooks/use-theme";
import { useHeaderInset } from "@/navigation/stack-header";

import { PeopleHeaderTitle } from "../components/people-header-title";
import { PersonRow } from "../components/person-row";
import { PersonSheet } from "../components/person-sheet";
import { RoleFilters } from "../components/role-filters";
import { usePeopleScreen } from "../hooks/use-people-screen.hook";
import { groupByInitial } from "../utils/group-by-initial";

const isIOS = Platform.OS === "ios";

export function PeopleScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerInset = useHeaderInset();
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
      <Stack.Screen
        options={{
          // iOS always centers `headerTitle`, so there the title is a left item next to the back button.
          headerTitleAlign: "left",
          headerTitle: isIOS ? "" : () => <PeopleHeaderTitle count={count} />,
          unstable_headerLeftItems: () => [
            {
              type: "custom",
              element: <PeopleHeaderTitle count={count} />,
              hidesSharedBackground: true,
            },
          ],
        }}
      />
      <View
        className="gap-4 px-screen pb-3"
        style={{ paddingTop: 8 + headerInset }}
      >
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
      <FlatList
        testID="people-list"
        data={groupByInitial(people)}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        // On iOS the safe areas, the header and the floating tab bar are added by the scroll view.
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-screen"
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
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
      <PersonSheet
        person={selectedPerson}
        visible={isSheetVisible}
        onClose={closeSheet}
      />
    </View>
  );
}
