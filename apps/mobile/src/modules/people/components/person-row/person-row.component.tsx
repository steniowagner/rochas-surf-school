import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { useTheme } from "@/hooks/use-theme";
import type { AppLocale } from "@/i18n/locales";

import { formatSince } from "../../utils/format-since";
import { roleChip } from "../../utils/role-chip";
import { PersonAvatar } from "../person-avatar";

import { PersonRowProps } from "./person-row.types";

/** One person of the directory: avatar, name, "since <month year>", role chip and a chevron. */
export function PersonRow({ person, onPress }: PersonRowProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { tone, labelKey } = roleChip[person.role];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={person.name}
      onPress={() => onPress(person)}
      className="min-h-16 flex-row items-center gap-3 rounded-card border border-line bg-surface p-3"
    >
      <PersonAvatar name={person.name} />
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="ds-text-list-title text-ink">
          {person.name}
        </Text>
        <Text className="ds-text-list-subtitle text-ink-2">
          {t("people.since", {
            date: formatSince(person.createdAt, i18n.language as AppLocale),
          })}
        </Text>
      </View>
      <Chip tone={tone}>{t(labelKey)}</Chip>
      <Ionicons name="chevron-forward" size={18} color={theme.ink3} />
    </Pressable>
  );
}
