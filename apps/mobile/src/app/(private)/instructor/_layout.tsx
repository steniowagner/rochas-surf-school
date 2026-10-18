import { Stack } from "expo-router";

import { useStackHeader } from "@/navigation/stack-header";

// The instructor experience.
export default function InstructorLayout() {
  const header = useStackHeader();

  return (
    <Stack screenOptions={header}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
