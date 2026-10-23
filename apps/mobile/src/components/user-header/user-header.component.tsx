import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { HeaderButton } from "@/components/ui/header-button";
import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { StudentAvatar } from "@/modules/classes/components/student-avatar";

import { useUserHeader } from "./user-header.hook";

const AVATAR_SIZE = 44;
// A little under the header buttons' 24pt, so the bell sits lighter in its circle.
const BELL_ICON_SIZE = 22;

/** The top of the home tabs (PAINEL-01): the signed-in person's avatar, a greeting for the time of day with their first name, and the notifications bell. */
export function UserHeader() {
  const { t } = useTranslation();
  const theme = useTheme();
  const header = useUserHeader();

  return (
    <View className="flex-row items-center gap-2.5">
      <View className="rounded-full" style={shadowStyle("iconButton", theme)}>
        {/* Accounts have no photo yet, so the initials show. */}
        <StudentAvatar
          name={header.name}
          photoUrl={null}
          size={AVATAR_SIZE}
          ringed
        />
      </View>
      <View className="flex-1">
        <Text className="ds-text-greeting text-ink-2">
          {t(`userHeader.greeting.${header.greetingPeriod}`)}
        </Text>
        {/* The screen's heading: on the Agenda it takes the place of the native title. */}
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          className="ds-text-greeting-name text-ink"
        >
          {header.firstName}
        </Text>
      </View>
      <HeaderButton
        icon="notifications-outline"
        iconSize={BELL_ICON_SIZE}
        label={header.notificationsLabel}
        badge={header.unreadCount}
        onPress={header.openNotifications}
        standalone
      />
    </View>
  );
}
