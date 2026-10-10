import { Stack } from "expo-router";

// The pending flow: a registration waiting for approval, with sign-out as its only way out.
export default function PendingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
