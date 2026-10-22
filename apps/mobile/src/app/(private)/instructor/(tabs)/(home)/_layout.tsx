import { Stack } from "expo-router";

import { useUserStackHeader } from "@/navigation/stack-header";

// The tab's header is the user header (avatar, greeting and bell), so it needs its own stack.
export default function InstructorHomeLayout() {
  const screenOptions = useUserStackHeader();

  return <Stack screenOptions={screenOptions} />;
}
