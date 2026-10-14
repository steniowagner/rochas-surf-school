import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import { PEOPLE_COUNT_PLACEHOLDER } from "../../constants/people";

import { PeopleEntryRowProps } from "./people-entry-row.types";

/** The "Pessoas" row of the admin's and the instructor's home, in a card of its own. */
export function PeopleEntryRow({ onPress }: PeopleEntryRowProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View className="rounded-card border border-line bg-surface px-4">
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className="min-h-11 flex-row items-center gap-3 py-3"
      >
        <Ionicons name="people-outline" size={20} color={theme.lagoon} />
        <Text className="ds-text-list-title flex-1 text-ink">
          {t("home.peopleRow")}
        </Text>
        <Text className="ds-text-list-subtitle text-ink-2">
          {t("people.count", { count: PEOPLE_COUNT_PLACEHOLDER })}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={theme.ink2} />
      </Pressable>
    </View>
  );
}
