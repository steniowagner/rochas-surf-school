import { Stack } from "expo-router";

// The student experience: the tab bar, with the screens that open above it in the same stack.
export default function StudentLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
