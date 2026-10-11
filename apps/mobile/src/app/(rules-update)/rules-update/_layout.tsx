import { Stack } from "expo-router";

// The rules-update flow: swipe-back is off because the only way out is accepting the rules (spec 013, D-05).
export default function RulesUpdateLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />
  );
}
