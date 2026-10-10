import { Stack } from "expo-router";

// The onboarding flow: waiting for approval, then the setup steps.
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
