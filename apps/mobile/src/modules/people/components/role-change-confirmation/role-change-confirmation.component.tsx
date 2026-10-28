import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";

import { ROLE_ACTION_LOOK } from "../../constants/role-actions";

import { RoleChangeConfirmationProps } from "./role-change-confirmation.types";

const GHOST_BACK_ACTIONS = [
  "promoteInstructor",
  "promoteAdmin",
  "demoteStudent",
];

export function RoleChangeConfirmation({
  action,
  name,
  showSeatsNote,
  loading,
  onConfirm,
  onBack,
}: RoleChangeConfirmationProps) {
  const { t } = useTranslation();

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text className="ds-text-sheet-title text-ink">
          {t(`people.roleConfirm.${action}.title`, { name })}
        </Text>
        <Text className="ds-text-body text-ink-2">
          {t(`people.roleConfirm.${action}.description`)}
        </Text>
        {showSeatsNote ? (
          <Text className="ds-text-body text-ink-2">
            {t("people.roleConfirm.promoteAdmin.seatsNote")}
          </Text>
        ) : null}
      </View>
      <View className="gap-2">
        <Button
          variant={ROLE_ACTION_LOOK[action].danger ? "danger" : "primary"}
          loading={loading}
          onPress={onConfirm}
        >
          {t(`people.roleConfirm.${action}.confirm`)}
        </Button>
        <Button
          variant={GHOST_BACK_ACTIONS.includes(action) ? "ghost" : "subtle"}
          disabled={loading}
          onPress={onBack}
        >
          {t("people.roleConfirm.back")}
        </Button>
      </View>
    </View>
  );
}
