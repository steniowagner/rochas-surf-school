import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UserHeader } from "@/components/user-header";

import type { UserStackHeaderProps } from "./user-stack-header.types";

/**
 * The user header as a stack's `header`, below the status bar. The stack measures it, so a screen's
 * `useHeaderInset` clears it under the transparent header as it clears the native one.
 */
export function UserStackHeader({ banded = false }: UserStackHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="user-stack-header"
      className={`px-screen pb-2 ${banded ? "bg-band" : "bg-page"}`}
      style={{ paddingTop: insets.top + 12 }}
    >
      <UserHeader />
    </View>
  );
}
