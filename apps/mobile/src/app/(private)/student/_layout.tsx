import { Stack } from "expo-router";

import { useStackHeader } from "@/navigation/stack-header";

// The student experience: the tab bar, with the screens that open above it in the same stack.
export default function StudentLayout() {
  const header = useStackHeader();

  return (
    <Stack screenOptions={header}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
