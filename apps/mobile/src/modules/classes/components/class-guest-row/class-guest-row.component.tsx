import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { Chip } from "@/components/ui/chip";

import { GuestAvatar } from "../guest-avatar";

import type { ClassGuestRowProps } from "./class-guest-row.types";

const AVATAR_SIZE = 32;

/** A trial guest in the class's list: not pressable, since a guest has no account and no person sheet. */
export function ClassGuestRow({ name, onTakeOut }: ClassGuestRowProps) {
  const { t } = useTranslation();
  const trial = t("classDetails.trialChip");

  return (
    <View className="min-h-11 flex-row items-center gap-3 border-t border-line px-3.5 py-2.5">
      <GuestAvatar size={AVATAR_SIZE} />
      <View className="flex-1 flex-row items-center gap-2">
        {name ? (
          <Text
            numberOfLines={1}
            className="ds-text-list-title shrink text-ink"
          >
            {name}
          </Text>
        ) : null}
        <Chip tone="muted">{trial}</Chip>
      </View>
      {onTakeOut ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${t("takeOutSheet.action")} ${name ?? trial}`}
          activeOpacity={BUTTON_ACTIVE_OPACITY}
          onPress={onTakeOut}
          className="min-h-11 items-center justify-center rounded-full border border-line px-4"
        >
          <Text className="ds-text-chip text-bad">
            {t("takeOutSheet.action")}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
