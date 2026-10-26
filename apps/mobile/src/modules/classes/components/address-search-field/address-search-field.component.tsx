import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { TextInput } from "@/components/ui/text-input";
import { useTheme } from "@/hooks/use-theme";

import { AddressSearchFieldProps } from "./address-search-field.types";

/** "Endereço": a field with a search icon and, under it while focused, the address suggestions to pick from. */
export function AddressSearchField({
  value,
  onChangeText,
  maxLength,
  suggestions,
  onPick,
}: AddressSearchFieldProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View className="gap-1.5">
      <TextInput
        icon={<Ionicons name="search-outline" size={20} color={theme.ink2} />}
        accessibilityLabel={t("locationSheet.address")}
        placeholder={t("locationSheet.addressSearchPlaceholder")}
        value={value}
        maxLength={maxLength}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {focused && suggestions.length > 0 ? (
        <View className="overflow-hidden rounded-control border border-line bg-surface">
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion.placeId}
              accessibilityRole="button"
              accessibilityLabel={`${suggestion.title}, ${suggestion.description}`}
              onPress={() => onPick(suggestion)}
              className="min-h-11 flex-row items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
            >
              <Ionicons name="location-outline" size={18} color={theme.ink3} />
              <View className="flex-1">
                <Text className="ds-text-list-title text-ink" numberOfLines={1}>
                  {suggestion.title}
                </Text>
                <Text
                  className="ds-text-list-subtitle text-ink-2"
                  numberOfLines={1}
                >
                  {suggestion.description}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
