import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { useTheme } from "@/hooks/use-theme";

import { LocationPickerProps } from "./location-picker.types";

/**
 * The saved locations as rows (name and address), one chosen, and "Novo local" to save another in place. While
 * managing, a row opens its edit sheet instead of being chosen, and "Novo local" is hidden.
 */
export function LocationPicker({
  locations,
  selectedId,
  managing,
  onSelect,
  onEditPress,
  onAddPress,
}: LocationPickerProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View className="gap-2">
      {locations.map((location) => {
        const selected = location.id === selectedId;

        return (
          <Pressable
            key={location.id}
            accessibilityRole="radio"
            accessibilityLabel={location.name}
            accessibilityState={{ checked: selected }}
            disabled={managing && location.archived}
            onPress={() =>
              managing ? onEditPress(location) : onSelect(location.id)
            }
            className={`min-h-11 flex-row items-center gap-3 rounded-card border px-4 py-3 ${
              selected ? "border-grape bg-grape-tint" : "border-line bg-surface"
            }`}
          >
            <Ionicons
              name="location-outline"
              size={20}
              color={selected ? theme.grape : theme.ink3}
            />
            <View className="flex-1">
              <Text className="ds-text-list-title text-ink">
                {location.name}
              </Text>
              <Text className="ds-text-list-subtitle text-ink-2">
                {location.address}
              </Text>
            </View>
            {location.archived ? (
              <Text className="ds-text-chip rounded-full bg-dim px-2.5 py-1 text-ink-2">
                {t("locationPicker.archived")}
              </Text>
            ) : null}
            {managing && !location.archived ? (
              <Ionicons name="create-outline" size={22} color={theme.ink2} />
            ) : null}
            {!managing && selected ? (
              <Ionicons name="checkmark" size={22} color={theme.grape} />
            ) : null}
          </Pressable>
        );
      })}
      {managing ? null : (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("newClass.location.add")}
          activeOpacity={BUTTON_ACTIVE_OPACITY}
          onPress={onAddPress}
          className="min-h-11 flex-row items-center justify-center gap-1.5 self-start rounded-full border border-dashed border-input-line px-4"
        >
          <Ionicons name="add" size={16} color={theme.grape} />
          <Text className="ds-text-chip text-grape">
            {t("newClass.location.add")}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
