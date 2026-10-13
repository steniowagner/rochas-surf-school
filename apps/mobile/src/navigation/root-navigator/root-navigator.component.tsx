import { Stack } from "expo-router";

import { useSessionExpired } from "@/modules/auth/hooks/use-session-expired.hook";
import { usePushRegistration } from "@/modules/notifications/hooks/use-push-registration.hook";

import { useRootNavigator } from "./root-navigator.hook";

// Each flow's group is reachable only while resolveFlow picks it (D-01). `index` stays open and redirects to the
// resolved flow, so when the flow changes the guards fall back to it.
export function RootNavigator() {
  const flow = useRootNavigator();

  // The only place the "session expired" message is shown, however many calls failed together.
  useSessionExpired();

  // Sends this phone's push token for a pending or approved account (spec 020, D-12).
  usePushRegistration();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={flow === "auth"}>
        <Stack.Screen name="(public)/auth" />
      </Stack.Protected>
      <Stack.Protected guard={flow === "pending"}>
        <Stack.Screen name="(pending)/pending" />
      </Stack.Protected>
      <Stack.Protected guard={flow === "onboarding"}>
        <Stack.Screen name="(onboarding)/onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={flow === "rules-update"}>
        <Stack.Screen name="(rules-update)/rules-update" />
      </Stack.Protected>
      <Stack.Protected guard={flow === "reactivation"}>
        <Stack.Screen name="(reactivation)/reactivation" />
      </Stack.Protected>
      <Stack.Protected
        guard={flow === "offboarding-denied" || flow === "offboarding-removed"}
      >
        <Stack.Screen name="(offboarding)/offboarding" />
      </Stack.Protected>
      <Stack.Protected guard={flow === "student"}>
        <Stack.Screen name="(private)/student" />
      </Stack.Protected>
      <Stack.Protected guard={flow === "instructor"}>
        <Stack.Screen name="(private)/instructor" />
      </Stack.Protected>
      <Stack.Protected guard={flow === "admin"}>
        <Stack.Screen name="(private)/admin" />
      </Stack.Protected>
    </Stack>
  );
}
