import { Ionicons } from "@expo/vector-icons";
import { radii } from "@rochas-surf-school/design-tokens";
import { GlassView } from "expo-glass-effect";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import { BUTTON_ACTIVE_OPACITY } from "../button/button.constants";

import { useHeaderButton } from "./header-button.hook";
import type { HeaderButtonProps } from "./header-button.types";

const DEFAULT_ICON_SIZE = 24;
// Grows the default icon's touch area to the 44pt minimum inside a native header.
const HIT_SLOP = 10;

/**
 * The action at the right of a header: just the icon, with no circle, background or shadow of its own (a native
 * header draws them), and an optional count badge.
 */
export function HeaderButton({
  icon,
  iconSize = DEFAULT_ICON_SIZE,
  label,
  onPress,
  badge,
  standalone = false,
}: HeaderButtonProps) {
  const theme = useTheme();
  const { badgeText, showGlass, glassColorScheme } = useHeaderButton({
    badge,
    standalone,
  });

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={BUTTON_ACTIVE_OPACITY}
      hitSlop={standalone ? undefined : HIT_SLOP}
      onPress={onPress}
      className={
        standalone ? "h-11 w-11 items-center justify-center" : undefined
      }
    >
      {showGlass ? (
        <GlassView
          testID="header-button-glass"
          isInteractive
          colorScheme={glassColorScheme}
          style={styles.glass}
        />
      ) : null}
      <Ionicons name={icon} size={iconSize} color={theme.ink} />
      {badgeText ? (
        <View
          testID="header-button-badge"
          className={`absolute h-4 min-w-4 items-center justify-center rounded-full bg-bad px-1 ${standalone ? "right-2 top-1" : "-right-1.5 -top-1"}`}
        >
          {/* Android pads text for accents; without it the digits sit low in the pill. */}
          <Text
            style={{ includeFontPadding: false }}
            className="ds-text-badge text-center text-on-color"
          >
            {badgeText}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  glass: { ...StyleSheet.absoluteFill, borderRadius: radii.pill },
});
