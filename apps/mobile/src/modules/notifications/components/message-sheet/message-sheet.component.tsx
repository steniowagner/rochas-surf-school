import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";
import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/hooks/use-theme";
import { ClassDayHeader } from "@/modules/enrolment/components/class-day-header";

import { useMessageSheet } from "./message-sheet.hook";
import type { MessageSheetProps } from "./message-sheet.types";

/**
 * A message an admin wrote, as written: its sender and, when the screen can lead there, its class.
 */
export function MessageSheet({ message, visible, onClose, onOpenClass }: MessageSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const sheet = useMessageSheet({ message, visible, onOpenClass });

  return (
    <BottomModal visible={visible} onClose={onClose}>
      {message ? (
        <View className="gap-4">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-icon-button bg-sun">
              <Ionicons name="megaphone-outline" size={22} color={theme.onColor} />
            </View>
            <View className="flex-1">
              <Text className="ds-text-list-title text-ink">
                {t("notifications.messageSheet.eyebrow")}
              </Text>
              {sheet.subtitle ? (
                <Text className="ds-text-list-subtitle text-ink-2">{sheet.subtitle}</Text>
              ) : null}
            </View>
          </View>
          <View className="gap-3">
            <Text className="ds-text-message-title text-ink">{message.title}</Text>
            <Text className="ds-text-body text-ink">{message.text}</Text>
          </View>
          {sheet.isClassLoading ? (
            <View testID="message-sheet-class-loading">
              <Skeleton className="h-32 rounded-card" />
            </View>
          ) : null}
          {sheet.classItem ? (
            <View className="gap-2">
              <Text className="ds-text-section-label text-ink-2">
                {t("notifications.messageSheet.classLabel")}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={BUTTON_ACTIVE_OPACITY}
                onPress={sheet.openClass}
                className="flex-row items-center gap-3 rounded-card border border-line bg-surface p-4"
              >
                <View className="flex-1">
                  <ClassDayHeader
                    discipline={sheet.classItem.discipline}
                    level={sheet.classItem.level}
                    startsAt={sheet.classItem.startsAt}
                    endsAt={sheet.classItem.endsAt}
                    locationName={sheet.classItem.location.name}
                  />
                </View>
                <Ionicons
                  testID="message-sheet-class-chevron"
                  name="chevron-forward"
                  size={20}
                  color={theme.ink3}
                />
              </TouchableOpacity>
            </View>
          ) : null}
          <Button onPress={onClose}>{t("notifications.messageSheet.confirm")}</Button>
        </View>
      ) : null}
    </BottomModal>
  );
}
