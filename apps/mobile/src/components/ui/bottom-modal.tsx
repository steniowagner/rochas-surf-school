import { useCallback, useEffect, useRef, type ReactNode } from "react";
import BottomSheet, {
  BottomSheetView,
  type BottomSheetBackdropProps,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radii, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const SCRIM_OPACITY = 0.45;

export type BottomModalProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

/**
 * A bottom sheet that slides up from the bottom of the screen. It closes when the user drags it down,
 * flicks it down, or taps the backdrop; dragging above its content stretches it with an elastic effect.
 *
 * Requires a `BottomSheetModalProvider` above it (see the root layout).
 */
export function BottomModal({ visible, onClose, children }: BottomModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.forceClose();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={SCRIM_OPACITY}
        onPress={onClose}
        pressBehavior="close"
        style={[props.style, { backgroundColor: theme.ink }]}
      />
    ),
    [theme.ink],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: theme.page,
        borderTopLeftRadius: radii.sheet,
        borderTopRightRadius: radii.sheet,
      }}
      handleIndicatorStyle={{ backgroundColor: theme.line }}
      index={-1}
    >
      <BottomSheetView
        style={{
          paddingHorizontal: spacing.screen,
          paddingBottom: insets.bottom + spacing.groupGap,
        }}
      >
        {children}
      </BottomSheetView>
    </BottomSheet>
  );
}
