import { Image } from "expo-image";
import { useState } from "react";
import { Text, View } from "react-native";

import { getInitials } from "@/utils/get-initials";

import { PersonAvatarProps } from "./person-avatar.types";

/** The person's photo, or their initials when there is none or it fails to load, in a circle. */
export function PersonAvatar({ name, photoUrl, size = "md" }: PersonAvatarProps) {
  const large = size === "lg";
  // The address that failed, not a flag: a row that a list reuses for someone else tries their photo.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-full bg-sand ${large ? "h-16 w-16" : "h-10 w-10"}`}
    >
      {photoUrl !== null && photoUrl !== failedUrl ? (
        <Image
          testID="person-avatar-photo"
          accessibilityLabel={name}
          source={{ uri: photoUrl }}
          recyclingKey={photoUrl}
          onError={() => setFailedUrl(photoUrl)}
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <Text
          accessibilityLabel={getInitials(name)}
          className={`text-grape ${large ? "ds-text-sheet-title" : "ds-text-list-title"}`}
        >
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}
