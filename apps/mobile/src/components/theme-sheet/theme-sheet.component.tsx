import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { useTheme } from "@/hooks/use-theme";
import { themePreferences } from "@/services/preferences/preferences.storage";

import { THEME_ICONS } from "./theme-sheet.constants";
import { useThemeSheet } from "./theme-sheet.hook";
import { ThemeSheetProps } from "./theme-sheet.types";

export function ThemeSheet({ visible, onClose }: ThemeSheetProps) {
  const { theme, selectTheme } = useThemeSheet({ onClose });
  const { t } = useTranslation();
  const colors = useTheme();

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <View className="mb-3.5 gap-[4px]">
        <Text className="ds-text-sheet-title text-ink">
          {t("themeSheet.title")}
        </Text>
        <Text className="ds-text-body text-ink-2">
          {t("themeSheet.description")}
        </Text>
      </View>

      {themePreferences.map((choice) => {
        const isSelected = choice === theme;

        return (
          <Pressable
            key={choice}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => selectTheme(choice)}
            className="min-h-11 flex-row items-center gap-3 border-t border-line py-3"
          >
            <Ionicons
              name={THEME_ICONS[choice]}
              size={20}
              color={colors.lagoon}
            />
            <Text className="ds-text-list-title flex-1 text-ink">
              {t(`theme.${choice}`)}
            </Text>
            {isSelected ? (
              <Ionicons name="checkmark" size={19} color={colors.lagoon} />
            ) : null}
          </Pressable>
        );
      })}
    </BottomModal>
  );
}
