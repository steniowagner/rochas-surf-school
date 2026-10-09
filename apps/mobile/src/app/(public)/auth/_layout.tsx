import { Stack } from "expo-router";

// The signed-out flow: sign-in → create account → confirm code.
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
