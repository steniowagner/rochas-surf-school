import type { ComponentProps } from "react";
import type Animated from "react-native-reanimated";

export type DisciplineFilterButtonProps = {
  /** `filter` on the closed button, `close` on the open one. */
  icon: "filter" | "close";
  label: string;
  onPress: () => void;
  /** The turn both buttons share (−90° while open). */
  turnStyle: ComponentProps<typeof Animated.View>["style"];
  turnTestID: string;
  /** Hides the button from accessibility, while the open one takes its place. */
  hidden?: boolean;
};
