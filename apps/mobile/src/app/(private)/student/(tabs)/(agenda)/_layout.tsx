import { Stack } from "expo-router";

import { useUserStackHeader } from "@/navigation/stack-header";

// The tab's header is the user header (avatar, greeting and bell), on the Agenda band, so it needs its own stack.
export default function AgendaLayout() {
  const screenOptions = useUserStackHeader({ banded: true });

  return <Stack screenOptions={screenOptions} />;
}
