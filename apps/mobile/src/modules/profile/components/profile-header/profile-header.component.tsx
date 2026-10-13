import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { Chip } from "@/components/ui/chip";

import { ProfileAvatar } from "../profile-avatar";

import { ProfileHeaderProps } from "./profile-header.types";

/** The avatar, the name and a chip with the role. */
export function ProfileHeader({ name, role }: ProfileHeaderProps) {
  const { t } = useTranslation();

  return (
    <View className="items-center gap-3">
      <ProfileAvatar name={name} />
      <Text
        accessibilityRole="header"
        className="ds-text-screen-title text-center text-ink"
      >
        {name}
      </Text>
      <Chip tone="info">{t(`profile.role.${role}`)}</Chip>
    </View>
  );
}
