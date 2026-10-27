import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { getInitials } from "@/utils/get-initials";

import type { StudentAvatarProps } from "./student-avatar.types";

// The erased person's icon takes half the circle, as the guest's does.
const ICON_RATIO = 0.5;
// The initials take this share of the circle, so they fit from 26pt up.
const INITIALS_RATIO = 0.33;
// `ds-text-chip` fixes the line height for 10.5px type, so it scales with the font size here or a larger circle clips the glyphs.
const LINE_HEIGHT_RATIO = 1.3;

/**
 * A person's photo, or their initials on a `sand` circle when there is none or it fails to load; an erased person
 * gets the guest's person icon instead.
 */
export function StudentAvatar({
  name,
  photoUrl,
  size,
  ringed = false,
  erased = false,
}: StudentAvatarProps) {
  const theme = useTheme();
  const fontSize = Math.round(size * INITIALS_RATIO);
  const [failed, setFailed] = useState(false);
  const showPhoto = photoUrl !== null && !failed && !erased;

  return (
    <View
      accessibilityLabel={name}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className={`items-center justify-center overflow-hidden bg-sand ${ringed ? "border-2 border-surface" : ""}`}
    >
      {erased ? (
        <Feather
          testID="student-avatar-erased"
          name="user"
          size={Math.round(size * ICON_RATIO)}
          color={theme.ink2}
        />
      ) : showPhoto ? (
        <Image
          testID="student-avatar-photo"
          source={{ uri: photoUrl }}
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <Text
          style={{
            fontSize,
            lineHeight: Math.round(fontSize * LINE_HEIGHT_RATIO),
          }}
          className="ds-text-chip text-ink"
        >
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}
