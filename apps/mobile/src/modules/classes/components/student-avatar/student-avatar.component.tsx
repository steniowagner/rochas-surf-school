import { Image } from "expo-image";
import { useState } from "react";
import { Text, View } from "react-native";

import { getInitials } from "@/utils/get-initials";

import type { StudentAvatarProps } from "./student-avatar.types";

// The initials take this share of the circle, so they fit from 26pt up.
const INITIALS_RATIO = 0.4;

/** A person's photo, or their initials on a `sand` circle when there is none or it fails to load. */
export function StudentAvatar({ name, photoUrl, size, ringed = false }: StudentAvatarProps) {
  const [failed, setFailed] = useState(false);
  const showPhoto = photoUrl !== null && !failed;

  return (
    <View
      accessibilityLabel={name}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className={`items-center justify-center overflow-hidden bg-sand ${ringed ? "border-2 border-surface" : ""}`}
    >
      {showPhoto ? (
        <Image
          testID="student-avatar-photo"
          source={{ uri: photoUrl }}
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <Text
          style={{ fontSize: Math.round(size * INITIALS_RATIO) }}
          className="ds-text-chip text-ink"
        >
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}
