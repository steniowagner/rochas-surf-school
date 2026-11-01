import { spacing } from "@rochas-surf-school/design-tokens";
import { Platform } from "react-native";

/**
 * The room below a screen's bottom content. iOS's inset already leaves a gap above the home indicator, but Android's
 * ends right at the navigation bar (48 with 3-button navigation, 24 with 2-button or gesture), so content needs a gap
 * on top of it.
 */
export const getBottomPadding = (bottomInset: number, minimum: number) =>
  Math.max(
    Platform.OS === "android" ? bottomInset + spacing.cardGap : bottomInset,
    minimum,
  );

/**
 * Added to a `KeyboardAvoidingView`'s `keyboardVerticalOffset`: the keyboard already covers the room kept for the
 * navigation bar or home indicator, so bottom content rests a card gap above the keyboard instead of that full padding.
 */
export const getKeyboardGapOffset = (bottomPadding: number) =>
  spacing.cardGap - bottomPadding;
