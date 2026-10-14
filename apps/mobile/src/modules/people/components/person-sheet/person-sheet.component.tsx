import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";
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
          <View className="items-center gap-2">
            <PersonAvatar name={person.name} size="lg" />
            <Text className="ds-text-sheet-title text-ink">{person.name}</Text>
            <Chip tone={roleChip[person.role].tone}>
              {t(roleChip[person.role].labelKey)}
            </Chip>
          </View>
          {formattedNumber ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("people.whatsapp")}
              onPress={openChat}
              className="min-h-12 flex-row items-center gap-3 rounded-card border border-line bg-surface px-4"
            >
              <FontAwesome name="whatsapp" size={20} color={theme.ok} />
              <View className="flex-1">
                <Text className="ds-text-list-title text-ink">
                  {t("people.whatsapp")}
                </Text>
                <Text className="ds-text-list-subtitle text-ink-2">
                  {formattedNumber}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.ink3} />
            </Pressable>
          ) : null}
          <Button variant="ghost" onPress={onClose}>
            {t("common.close")}
          </Button>
        </View>
      ) : null}
    </BottomModal>
  );
}
