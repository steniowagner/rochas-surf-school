import { Ionicons } from "@expo/vector-icons";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { getDateLocale } from "@/utils/calendar-dates";

import { classMessageTime } from "../../utils/class-message-time";

import type { ClassMessagesProps } from "./class-messages.types";

/** "Mensagens desta aula": what admins sent to the class, newest first, each opening in the message sheet. */
export function ClassMessages({ messages, now, onOpenMessage }: ClassMessagesProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale = getDateLocale(i18n.language);

  return (
    <View className="gap-2">
      <Text className="ds-text-section-label text-ink-2">
        {t("classDetails.messages.title", { count: messages.length })}
      </Text>
      <View className="overflow-hidden rounded-card border border-line bg-surface">
        {messages.map((message, index) => (
          <Fragment key={message.id}>
            {index > 0 ? <View className="mx-4 h-px bg-line" /> : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpenMessage(message)}
              className="min-h-11 flex-row gap-3 p-4"
            >
              <View className="h-9 w-9 items-center justify-center rounded-control bg-sun-tint">
                <Ionicons name="megaphone-outline" size={18} color={theme.sun} />
              </View>
              <View className="flex-1 gap-1">
                <View className="flex-row items-start gap-2">
                  <Text numberOfLines={2} className="ds-text-list-title flex-1 text-ink">
                    {message.title}
                  </Text>
                  <Text className="ds-text-list-subtitle text-ink-2">
                    {classMessageTime(message.createdAt, now, locale)}
                  </Text>
                </View>
                <Text numberOfLines={2} className="ds-text-list-subtitle text-ink-2">
                  {message.message}
                </Text>
              </View>
            </Pressable>
          </Fragment>
        ))}
      </View>
    </View>
  );
}
