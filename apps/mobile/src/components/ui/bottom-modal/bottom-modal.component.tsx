import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useCallback } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { accentRoom } from "@/constants/accent-room";
import { Colors, radii, spacing } from "@/constants/theme";
import { themeVariables } from "@/constants/theme-variables";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

import { useBottomModal } from "./bottom-modal.hook";
import { BottomModalProps } from "./bottom-modal.types";

const SCRIM_OPACITY = 0.45;
// The scrim is dark in both themes (the theme's own ink turns light in dark mode).
const SCRIM_COLOR = Colors.light.ink;
// The handle's padding on each side (the library's default).
const HANDLE_PADDING = 10;
// The sheet clips its content, so the accent room above a sheet title is moved from the handle's bottom padding
// into the content: the title stays where it was and its accents aren't cut.
const TITLE_ROOM = accentRoom("sheetTitle");

/**
 * A bottom sheet that slides up from the bottom of the screen. It closes when the user drags it down,
 * flicks it down, or taps the backdrop; dragging above its content stretches it with an elastic effect.
 *
 * It is a modal sheet rendered by the `BottomSheetModalProvider` of the root layout, above the screens and above a
 * native tab bar (a plain sheet would sit under the tab bar, which floats over the screen's content).
 */
export function BottomModal({ visible, onClose, children }: BottomModalProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { bottomSheetRef } = useBottomModal({ visible });

  // The sheet library keeps the backdrop component, so its identity must follow what it reads.
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={SCRIM_OPACITY}
        onPress={onClose}
        pressBehavior="close"
        style={[props.style, { backgroundColor: SCRIM_COLOR }]}
      />
    ),
    [onClose],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: theme.page,
        borderTopLeftRadius: radii.sheet,
        borderTopRightRadius: radii.sheet,
      }}
      handleIndicatorStyle={{ backgroundColor: theme.line }}
      handleStyle={{ paddingBottom: HANDLE_PADDING - TITLE_ROOM }}
      onDismiss={onClose}
    >
      <BottomSheetView
        style={{
          paddingTop: TITLE_ROOM,
          paddingHorizontal: spacing.screen,
          // Just the home-indicator room (or the screen margin on phones without one).
          paddingBottom: Math.max(insets.bottom, spacing.screen),
        }}
      >
        {/* The sheet can sit inside a screen that overrides the palette variables, so it sets the app's own. */}
        <View style={themeVariables[colorScheme === "dark" ? "dark" : "light"]}>
          {children}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
