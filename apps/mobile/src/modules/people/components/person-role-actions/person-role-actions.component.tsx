import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import { ROLE_ACTION_LOOK, ROLE_ACTIONS } from "../../constants/role-actions";

import { PersonRoleActionsProps } from "./person-role-actions.types";

export function PersonRoleActions({ role, onSelect, onRemove }: PersonRoleActionsProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View className="gap-1">
      {ROLE_ACTIONS[role].map((action) => {
        const { icon, danger } = ROLE_ACTION_LOOK[action];

        return (
          <Pressable
            key={action}
            accessibilityRole="button"
            accessibilityLabel={t(`people.roleActions.${action}.title`)}
            onPress={() => onSelect(action)}
            className="min-h-12 flex-row items-center gap-3"
          >
            <Feather name={icon} size={20} color={danger ? theme.bad : theme.ink2} />
            <View className="flex-1">
              <Text className={`ds-text-list-title ${danger ? "text-bad" : "text-ink"}`}>
                {t(`people.roleActions.${action}.title`)}
              </Text>
              <Text className="ds-text-list-subtitle text-ink-2">
                {t(`people.roleActions.${action}.subtitle`)}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.ink3} />
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("people.removeAction.title")}
        onPress={onRemove}
        className="min-h-12 flex-row items-center gap-3"
      >
        <Feather name="trash-2" size={20} color={theme.bad} />
        <View className="flex-1">
          <Text className="ds-text-list-title text-bad">
            {t("people.removeAction.title")}
          </Text>
          <Text className="ds-text-list-subtitle text-ink-2">
            {t("people.removeAction.subtitle")}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={theme.ink3} />
      </Pressable>
    </View>
  );
}
