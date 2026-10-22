import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, TouchableOpacity } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { useTheme } from "@/hooks/use-theme";

import { StudentAvatar } from "../student-avatar";

import type { ClassStudentRowProps } from "./class-student-row.types";

const AVATAR_SIZE = 32;

/** A student in the class's list: the row opens their person sheet; the admin's "Retirar" only takes them out. */
export function ClassStudentRow({ name, photoUrl, onPress, onTakeOut }: ClassStudentRowProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      className="min-h-11 flex-row items-center gap-3 border-t border-line px-3.5 py-2.5"
    >
      <StudentAvatar name={name} photoUrl={photoUrl} size={AVATAR_SIZE} />
      <Text numberOfLines={1} className="ds-text-list-title flex-1 text-ink">
        {name}
      </Text>
      {onTakeOut ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${t("takeOutSheet.action")} ${name}`}
          activeOpacity={BUTTON_ACTIVE_OPACITY}
          onPress={onTakeOut}
          className="min-h-11 items-center justify-center rounded-full border border-line px-4"
        >
          <Text className="ds-text-chip text-bad">{t("takeOutSheet.action")}</Text>
        </TouchableOpacity>
      ) : (
        <Ionicons testID="class-student-row-chevron" name="chevron-forward" size={16} color={theme.ink3} />
      )}
    </Pressable>
  );
}
