import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";
import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/hooks/use-theme";
import { InstructorPill } from "@/modules/classes/components/instructor-pill";
import { RequestSeatClassCard } from "@/modules/enrolment/components/request-seat-class-card";
import { PersonSheet } from "@/modules/people/components/person-sheet";

import { useMessageSheet } from "./message-sheet.hook";
import type { MessageSheetProps } from "./message-sheet.types";

/**
 * A message an admin wrote, as written: its sender and, when the screen can lead there, its class. Pressing the sender
 * swaps this sheet for their details, and closing those brings the message back.
 */
export function MessageSheet({ message, visible, onClose, onOpenClass }: MessageSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const sheet = useMessageSheet({ message, visible, onClose, onOpenClass });
  const sender = message?.sender ?? null;

  return (
    <>
      <BottomModal visible={sheet.messageVisible} onClose={sheet.close}>
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
                {sheet.time ? (
                  <Text className="ds-text-list-subtitle text-ink-2">{sheet.time}</Text>
                ) : null}
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("notifications.messageSheet.close")}
                activeOpacity={BUTTON_ACTIVE_OPACITY}
                onPress={sheet.close}
                className="h-11 w-11 items-center justify-center rounded-full bg-dim"
              >
                <Ionicons name="close" size={22} color={theme.ink} />
              </TouchableOpacity>
            </View>
            {sender ? (
              <View className="items-start">
                <InstructorPill
                  name={sender.name}
                  photoUrl={sender.photoUrl}
                  isViewer={sheet.isViewer}
                  onPress={sheet.openPerson}
                />
              </View>
            ) : null}
            <View className="gap-2">
              <Text className="ds-text-message-title text-ink">{message.title}</Text>
              <Text className="ds-text-body text-ink-2">{message.text}</Text>
            </View>
            {sheet.isClassLoading ? (
              <View testID="message-sheet-class-loading">
                <Skeleton className="h-40 rounded-card" />
              </View>
            ) : null}
            {sheet.classItem ? (
              <RequestSeatClassCard
                discipline={sheet.classItem.discipline}
                level={sheet.classItem.level}
                startsAt={sheet.classItem.startsAt}
                endsAt={sheet.classItem.endsAt}
                locationName={sheet.classItem.location.name}
                onPress={sheet.openClass}
              />
            ) : null}
            <Button onPress={sheet.close}>{t("notifications.messageSheet.confirm")}</Button>
          </View>
        ) : null}
      </BottomModal>
      <PersonSheet
        person={sender}
        hideMissingWhatsapp
        visible={sheet.personVisible}
        onClose={sheet.closePerson}
      />
    </>
  );
}
