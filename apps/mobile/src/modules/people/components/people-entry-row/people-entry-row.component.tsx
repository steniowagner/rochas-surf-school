import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { entryRowContainerClassName } from "@/utils/entry-row-container";

import { usePeopleCount } from "../../hooks/use-people-count.hook";

import { PeopleEntryRowProps } from "./people-entry-row.types";

/** The "Pessoas" row of the admin's and the instructor's home, in a card of its own. */
export function PeopleEntryRow({ grouped, onPress }: PeopleEntryRowProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: total } = usePeopleCount();

  // The count shows once loaded; while loading or after an error the row has none.
  const count =
    total === undefined ? null : (
      <Text className="ds-text-list-subtitle text-ink-2">
        {t("people.count", { count: total })}
      </Text>
    );

  return (
    <View className={entryRowContainerClassName(grouped)}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className="min-h-11 flex-row items-center gap-3 py-3"
      >
        <Ionicons name="people-outline" size={20} color={theme.lagoon} />
        {grouped ? (
          <View className="flex-1 gap-0.5">
            <Text className="ds-text-list-title text-ink">
              {t("home.peopleRow")}
            </Text>
            {count}
          </View>
        ) : (
          <>
            <Text className="ds-text-list-title flex-1 text-ink">
              {t("home.peopleRow")}
            </Text>
            {count}
          </>
        )}
        <Ionicons name="chevron-forward" size={18} color={theme.ink2} />
      </Pressable>
    </View>
  );
}
