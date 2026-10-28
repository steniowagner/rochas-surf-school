import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import { ROLE_ACTION_LOOK } from "../../constants/role-actions";

import { RoleChangeConfirmationProps } from "./role-change-confirmation.types";

export function RoleChangeConfirmation({
  action,
  name,
  showSeatsNote,
  loading,
  onConfirm,
  onBack,
}: RoleChangeConfirmationProps) {
  const { t } = useTranslation();
  const [isInstructor, setIsInstructor] = useState(false);

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
        {action === "promoteAdmin" ? (
          <View>
            <Checkbox
              checked={isInstructor}
              onChange={setIsInstructor}
              label={t("people.instructorFlag.label")}
              disabled={loading}
            />
            <Text className="ds-text-list-subtitle text-ink-2">
              {t("people.instructorFlag.helper")}
            </Text>
          </View>
        ) : null}
      </View>
      <View className="gap-2">
        <Button
          variant={ROLE_ACTION_LOOK[action].danger ? "danger" : "primary"}
          loading={loading}
          onPress={() => onConfirm(isInstructor)}
        >
          {t(`people.roleConfirm.${action}.confirm`)}
        </Button>
        <Button variant="subtle" disabled={loading} onPress={onBack}>
          {t("people.roleConfirm.back")}
        </Button>
      </View>
    </View>
  );
}
