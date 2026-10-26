import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import type { GuestAvatarProps } from "./guest-avatar.types";

// The icon takes half the circle, as in the design.
const ICON_RATIO = 0.5;

/** A trial guest: a person icon on a `sand` circle, since a guest has no account, photo or initials to show. */
export function GuestAvatar({ size, ringed = false }: GuestAvatarProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      accessibilityLabel={t("classDetails.trialChip")}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className={`items-center justify-center bg-sand ${ringed ? "border-2 border-surface" : ""}`}
    >
      <Feather
        name="user"
        size={Math.round(size * ICON_RATIO)}
        color={theme.ink2}
      />
    </View>
  );
}
