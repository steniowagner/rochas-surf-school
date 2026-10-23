import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { iconSizes, shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { useNotificationRow } from "./notification-row.hook";
import { NotificationRowProps } from "./notification-row.types";

/** One notification: its tinted icon, title, optional body, when it arrived and, while unread, a dot. */
export function NotificationRow({ notification, now, onPress }: NotificationRowProps) {
  const theme = useTheme();
  const { iconName, glyphColor, tileClassName, time, accessibilityLabel } = useNotificationRow({
    notification,
    now,
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => onPress(notification)}
      className="min-h-16 flex-row items-start gap-3 rounded-card bg-surface p-4"
      style={shadowStyle("card", theme)}
    >
      <View
        testID="notification-row-icon"
        className={`h-10 w-10 items-center justify-center rounded-full ${tileClassName}`}
      >
        <Ionicons name={iconName} size={iconSizes.list} color={glyphColor} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="ds-text-list-title text-ink">{notification.title}</Text>
        {notification.body ? (
          <Text className="ds-text-list-subtitle text-ink-2">{notification.body}</Text>
        ) : null}
        <Text className="ds-text-card-meta text-ink-3">{time}</Text>
      </View>
      {notification.read ? null : (
        <View testID="notification-row-unread-dot" className="mt-1.5 h-2.5 w-2.5 rounded-full bg-sun" />
      )}
    </Pressable>
  );
}
