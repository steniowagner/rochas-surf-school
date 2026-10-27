import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { useLocationSearchHeader } from "./location-search-header.hook";
import { LocationSearchHeaderProps } from "./location-search-header.types";

/**
 * The search of the location screen: a field in the header (the screen's `headerTitle`, on its transparent header)
 * and, floating under the header, the address suggestions for what was typed.
 */
export function LocationSearchHeader(props: LocationSearchHeaderProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const search = useLocationSearchHeader(props);

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View
              testID="location-search-field"
              className="h-11 flex-row items-center gap-2 rounded-control border border-line bg-surface pl-3"
              style={{ width: search.fieldWidth }}
            >
              <Ionicons name="search-outline" size={18} color={theme.ink2} />
              <TextInput
                className="ds-text-body h-full flex-1 py-0 leading-5 text-ink"
                accessibilityLabel={t("locationSheet.addressSearchPlaceholder")}
                placeholder={t("locationSheet.addressSearchPlaceholder")}
                placeholderTextColor={theme.ink2}
                textAlignVertical="center"
                returnKeyType="search"
                autoCorrect={false}
                value={search.text}
                onChangeText={search.changeText}
              />
              {search.text ? (
                <TouchableOpacity
                  className="h-11 w-11 items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel={t("common.clear")}
                  activeOpacity={0.6}
                  onPress={search.clear}
                >
                  <Ionicons name="close-circle" size={18} color={theme.ink2} />
                </TouchableOpacity>
              ) : null}
            </View>
          ),
        }}
      />
      {search.rows.length > 0 ? (
        <View
          testID="location-suggestions"
          className="absolute left-screen right-screen overflow-hidden rounded-card bg-surface"
          style={[{ top: search.listTop }, shadowStyle("menuOption", theme)]}
        >
          {search.rows.map((row) => (
            <Pressable
              key={row.suggestion.placeId}
              accessibilityRole="button"
              accessibilityLabel={`${row.suggestion.title}, ${row.suggestion.description}`}
              onPress={() => search.pick(row.suggestion)}
              className="min-h-11 flex-row items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
            >
              <Ionicons name="location-outline" size={18} color={theme.ink3} />
              <View className="flex-1">
                <Text className="ds-text-body text-ink" numberOfLines={1}>
                  {row.before}
                  <Text className="font-body-800">{row.match}</Text>
                  {row.after}
                </Text>
                <Text
                  className="ds-text-list-subtitle text-ink-2"
                  numberOfLines={1}
                >
                  {row.suggestion.description}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </>
  );
}
