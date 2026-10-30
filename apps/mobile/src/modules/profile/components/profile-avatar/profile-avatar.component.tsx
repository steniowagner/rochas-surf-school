import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { useTheme } from "@/hooks/use-theme";
import { getInitials } from "@/utils/get-initials";

import { ProfileAvatarProps } from "./profile-avatar.types";

/**
 * The person's photo, or their initials when there is none or it fails to load, in a 112 pt circle, with an optional
 * camera button for changing the photo (not yet built).
 */
export function ProfileAvatar({
  name,
  photoUrl,
  onChangePhoto,
}: ProfileAvatarProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [failed, setFailed] = useState(false);

  return (
    <View className="h-28 w-28">
      <View className="h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-sand">
        {photoUrl !== null && !failed ? (
          <Image
            testID="profile-avatar-photo"
            accessibilityLabel={name}
            source={{ uri: photoUrl }}
            onError={() => setFailed(true)}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <Text
            accessibilityLabel={getInitials(name)}
            className="ds-text-screen-title text-grape"
          >
            {getInitials(name)}
          </Text>
        )}
      </View>
      {onChangePhoto ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("editProfile.changePhoto")}
          activeOpacity={BUTTON_ACTIVE_OPACITY}
          onPress={onChangePhoto}
          className="absolute bottom-0 right-0 h-11 w-11 items-center justify-center rounded-full border border-line bg-surface"
        >
          <Ionicons name="camera-outline" size={20} color={theme.ink} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
