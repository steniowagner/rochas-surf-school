import { SharedValue } from "react-native-reanimated";

export type CollapsingHeaderBackdropProps = {
  /** 0 while the screen's own title is in view, 1 once it has scrolled under the header. */
  progress: SharedValue<number>;
  /** The header's height: the area the content scrolls under. */
  height: number;
};
