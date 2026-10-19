import { Stack } from "expo-router";

import { useStackHeader } from "@/navigation/stack-header";

// The signed-out flow: sign-in → create account → confirm code.
export default function AuthLayout() {
  const header = useStackHeader();

  return (
    <Stack screenOptions={header}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
