import { SharedValue } from "react-native-reanimated";

export type CollapsingHeaderTitleProps = {
  title: string;
  /** 0 while the screen's own title is in view, 1 once it has scrolled under the header. */
  progress: SharedValue<number>;
};
