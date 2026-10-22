import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UserHeader } from "@/components/user-header";

/**
 * The user header as a stack's `header`, below the status bar. The stack measures it, so a screen's
 * `useHeaderInset` clears it under the transparent header as it clears the native one.
 */
export function UserStackHeader() {
  const insets = useSafeAreaInsets();

  return (
    <View className="bg-page px-screen pb-2" style={{ paddingTop: insets.top + 12 }}>
      <UserHeader />
    </View>
  );
}
