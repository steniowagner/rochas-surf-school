import { Feather, FontAwesome } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, TouchableOpacity, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { Chip } from "@/components/ui/chip";
import { useTheme } from "@/hooks/use-theme";

import { roleChip } from "../../utils/role-chip";
import { PersonAvatar } from "../person-avatar";

import { usePersonSheet } from "./person-sheet.hook";
import { PersonSheetProps } from "./person-sheet.types";

export function PersonSheet({ person, visible, onClose }: PersonSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { formattedNumber, openChat } = usePersonSheet({ person });

  return (
    <BottomModal visible={visible} onClose={onClose}>
      {person ? (
        <View className="gap-4">
          <View className="flex-row items-center gap-4">
            <PersonAvatar name={person.name} size="lg" />
            <View className="flex-1 items-start gap-2">
              <Text numberOfLines={2} className="ds-text-sheet-title text-ink">
                {person.name}
              </Text>
              <Chip tone={roleChip[person.role].tone}>
                {t(roleChip[person.role].labelKey)}
              </Chip>
            </View>
          </View>
          {formattedNumber ? (
            <>
              <View className="h-px bg-line" />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("people.whatsapp")}
                onPress={openChat}
                className="min-h-12 flex-row items-center gap-3"
              >
                <FontAwesome name="whatsapp" size={20} color={theme.lagoon} />
                <View className="flex-1">
                  <Text className="ds-text-list-title text-ink">
                    {t("people.whatsapp")}
                  </Text>
                  <Text className="ds-text-list-subtitle text-ink-2">
                    {formattedNumber}
                  </Text>
                </View>
                <Feather name="arrow-up-right" size={18} color={theme.ink3} />
              </Pressable>
            </>
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={onClose}
            className="min-h-11 items-center justify-center"
          >
            <Text className="ds-text-button text-lagoon">
              {t("common.close")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </BottomModal>
  );
}
