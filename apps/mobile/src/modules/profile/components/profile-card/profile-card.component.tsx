import { Children } from "react";
import { View } from "react-native";

import { ProfileCardProps } from "./profile-card.types";

/** A card of rows with a divider between them; rows that render nothing leave no divider. */
export function ProfileCard({ children }: ProfileCardProps) {
  return (
    <View className="rounded-card border border-line bg-surface px-4">
      {Children.toArray(children).map((child, index) => (
        <View key={index} className={index > 0 ? "border-t border-line" : ""}>
          {child}
        </View>
      ))}
    </View>
  );
}
