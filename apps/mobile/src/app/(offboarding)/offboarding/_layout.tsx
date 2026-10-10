import { Stack } from "expo-router";

import { resolveFlow } from "@/navigation/resolve-flow";
import { useSession } from "@/providers/session";

// The offboarding flow: the reason picks the screen, so a denied account can't reach the removed one and vice versa.
export default function OffboardingLayout() {
  const { user } = useSession();
  // Onboarding doesn't change the flow of a denied or removed account.
  const flow = resolveFlow({ user, onboardingCompleted: true });

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={flow === "offboarding-denied"}>
        <Stack.Screen name="denied" />
      </Stack.Protected>
      <Stack.Protected guard={flow === "offboarding-removed"}>
        <Stack.Screen name="removed" />
      </Stack.Protected>
    </Stack>
  );
}
