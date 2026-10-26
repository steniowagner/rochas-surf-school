import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import { useTeachingClassesEntryRow } from "./teaching-classes-entry-row.hook";
import type { TeachingClassesEntryRowProps } from "./teaching-classes-entry-row.types";

/** The "Minhas aulas" row of the instructor's and the admin's home, in a card of its own, with how many classes are assigned. */
export function TeachingClassesEntryRow({
  role,
  onPress,
}: TeachingClassesEntryRowProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { visible, subtitle } = useTeachingClassesEntryRow({ role });

  if (!visible) {
    return null;
  }

  return (
    <View className="rounded-card border border-line bg-surface px-4">
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className="min-h-11 flex-row items-center gap-3 py-3"
      >
        <MaterialCommunityIcons name="surfing" size={20} color={theme.lagoon} />
        <View className="flex-1 gap-0.5">
          <Text className="ds-text-list-title text-ink">
            {t("teachingClasses.title")}
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
