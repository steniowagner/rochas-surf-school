import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { entryRowContainerClassName } from "@/utils/entry-row-container";

import { useSchoolRulesEntryRow } from "./school-rules-entry-row.hook";
import { SchoolRulesEntryRowProps } from "./school-rules-entry-row.types";

/** The "Regras" row of the admin's and the instructor's home, in a card of its own, with how many rules there are. */
export function SchoolRulesEntryRow({
  role,
  grouped,
  onPress,
}: SchoolRulesEntryRowProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { subtitle } = useSchoolRulesEntryRow({ role });

  return (
    <View className={entryRowContainerClassName(grouped)}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className="min-h-11 flex-row items-center gap-3 py-3"
      >
        <Ionicons name="shield-outline" size={20} color={theme.lagoon} />
        <View className="flex-1 gap-0.5">
          <Text className="ds-text-list-title text-ink">
            {t("schoolRulesEntryRow.title")}
          </Text>
          {subtitle ? (
            <Text className="ds-text-list-subtitle text-ink-2">{subtitle}</Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.ink2} />
      </Pressable>
    </View>
  );
}
