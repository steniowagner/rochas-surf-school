import { Stack } from "expo-router";

import { useRootNavigator } from "@/navigation/root-navigator/root-navigator.hook";

// The offboarding flow: the reason picks the screen, so a denied account can't reach the removed one and vice versa.
export default function OffboardingLayout() {
  const flow = useRootNavigator();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={flow === "offboarding-denied"}>
        <Stack.Screen name="denied" />
      </Stack.Protected>
      <Stack.Protected guard={flow === "offboarding-removed"}>
        <Stack.Screen name="removed" />
      </Stack.Protected>
    </Stack>
  );
}
