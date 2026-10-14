import { Text, View } from "react-native";

import { getInitials } from "@/utils/get-initials";

import { PersonAvatarProps } from "./person-avatar.types";

/** The person's initials in a circle; no photo can be uploaded yet. */
export function PersonAvatar({ name, size = "md" }: PersonAvatarProps) {
  const large = size === "lg";

  return (
    <View
      className={`items-center justify-center rounded-full bg-sand ${large ? "h-16 w-16" : "h-10 w-10"}`}
    >
      <Text
        accessibilityLabel={getInitials(name)}
        className={`text-grape ${large ? "ds-text-sheet-title" : "ds-text-list-title"}`}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}
