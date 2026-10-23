import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { useTheme } from "@/hooks/use-theme";

import { SchoolRuleEditableRowProps } from "./school-rule-editable-row.types";

// The 36px buttons reach the 44px touch target; the 8px gap between them takes both slops.
const MOVE_HIT_SLOP = 4;

/** A rule of "Regras da escola": its text opens "Editar regra", and ↑ / ↓ move it one place. */
export function SchoolRuleEditableRow({
  rule,
  position,
  showDivider,
  moveUpDisabled,
  moveDownDisabled,
  onEdit,
  onMoveUp,
  onMoveDown,
}: SchoolRuleEditableRowProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      className={`flex-row items-start gap-3 px-4 ${showDivider ? "border-b border-line" : ""}`}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onEdit}
        className="flex-1 flex-row gap-3 py-3.5"
      >
        <Text className="ds-text-sheet-title w-9 text-sun">
          {String(position).padStart(2, "0")}
        </Text>
        <View className="flex-1 gap-0.5">
          <Text className="ds-text-list-title text-ink">{rule.title}</Text>
          <Text className="ds-text-body text-ink-2">{rule.description}</Text>
        </View>
      </Pressable>
      <View className="gap-2 py-3.5">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("manageSchoolRules.moveUp", { position })}
          accessibilityState={{ disabled: moveUpDisabled }}
          activeOpacity={BUTTON_ACTIVE_OPACITY}
          disabled={moveUpDisabled}
          onPress={onMoveUp}
          hitSlop={MOVE_HIT_SLOP}
          className="h-9 w-9 items-center justify-center rounded-icon-button border border-line bg-surface"
        >
          <Ionicons name="chevron-up" size={18} color={moveUpDisabled ? theme.ink3 : theme.ink} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("manageSchoolRules.moveDown", { position })}
          accessibilityState={{ disabled: moveDownDisabled }}
          activeOpacity={BUTTON_ACTIVE_OPACITY}
          disabled={moveDownDisabled}
          onPress={onMoveDown}
          hitSlop={MOVE_HIT_SLOP}
          className="h-9 w-9 items-center justify-center rounded-icon-button border border-line bg-surface"
        >
          <Ionicons name="chevron-down" size={18} color={moveDownDisabled ? theme.ink3 : theme.ink} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
