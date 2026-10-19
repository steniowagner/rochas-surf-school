import { Stack } from "expo-router";

import { useStackHeader } from "@/navigation/stack-header";

// The admin experience.
export default function AdminLayout() {
  const header = useStackHeader();

  return (
    <Stack screenOptions={header}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
