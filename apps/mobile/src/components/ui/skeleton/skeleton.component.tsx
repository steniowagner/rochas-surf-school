import Animated from "react-native-reanimated";

import { useSkeleton } from "./skeleton.hook";
import { SkeletonProps, SkeletonTone } from "./skeleton.types";

const toneClasses: Record<SkeletonTone, string> = {
  sand: "bg-sand",
  surface: "bg-surface",
};

/** A pulsing placeholder for content that is loading: give it the measures of what it stands for. */
export function Skeleton({ className = "", tone = "sand" }: SkeletonProps) {
  const { animatedStyle } = useSkeleton();

  return (
    <Animated.View
      className={`${toneClasses[tone]} ${className}`}
      style={animatedStyle}
    />
  );
}
