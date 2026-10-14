import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { useTheme } from "@/hooks/use-theme";

import { FilterBarProps } from "./filter-bar.types";

/** The applied filters as removable chips on the left, and the button that opens the filter sheet on the right. */
export function FilterBar({
  role,
  sort,
  onOpen,
  onClearRole,
  onClearSort,
}: FilterBarProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const chips = [
    ...(role === "all"
      ? []
      : [{ key: "role", label: t(`people.filter.${role}`), onPress: onClearRole }]),
    ...(sort === "name"
      ? [{ key: "sort", label: t("people.filter.sortName"), onPress: onClearSort }]
      : []),
  ];

  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-1 flex-row flex-wrap gap-2">
        {chips.map((chip) => (
          <TouchableOpacity
            key={chip.key}
            accessibilityRole="button"
            accessibilityLabel={t("people.filter.remove", { label: chip.label })}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={chip.onPress}
            className="min-h-11 flex-row items-center gap-1.5 rounded-full bg-sand px-4"
          >
            <Text className="ds-text-chip uppercase text-grape">
              {chip.label}
            </Text>
            <Ionicons name="close" size={16} color={theme.grape} />
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t("people.filter.button")}
        activeOpacity={BUTTON_ACTIVE_OPACITY}
        onPress={onOpen}
        className="h-11 w-11 items-center justify-center rounded-full border border-line bg-surface"
      >
        <Ionicons name="options-outline" size={22} color={theme.ink} />
      </TouchableOpacity>
    </View>
  );
}
