import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { useTheme } from "@/hooks/use-theme";
import {
  localeFlags,
  localeNames,
  supportedLocales,
  type AppLocale,
} from "@/i18n/locales";

import { useLanguageSheet } from "./language-sheet.hook";
import { LanguageSheetProps } from "./language-sheet.types";

export function LanguageSheet({ visible, onClose }: LanguageSheetProps) {
  const { selectLocale } = useLanguageSheet({ onClose });
  const { t, i18n } = useTranslation();
  const theme = useTheme();

  const currentLocale = i18n.language as AppLocale;

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <View className="mb-3.5 gap-[4px]">
        <Text className="ds-text-sheet-title text-ink">
          {t("language.title")}
        </Text>
        <Text className="ds-text-body text-ink-2">
          {t("language.description")}
        </Text>
      </View>

      {supportedLocales.map((locale) => {
        const isSelected = locale === currentLocale;

        return (
          <Pressable
            key={locale}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => selectLocale(locale)}
            className="min-h-11 flex-row items-center gap-3 border-t border-line py-3"
          >
            <Text className="text-2xl">{localeFlags[locale]}</Text>
            <Text className="ds-text-list-title flex-1 text-ink">
              {localeNames[locale]}
            </Text>
            {isSelected ? (
              <Ionicons name="checkmark" size={19} color={theme.lagoon} />
            ) : null}
          </Pressable>
        );
      })}
    </BottomModal>
  );
}
