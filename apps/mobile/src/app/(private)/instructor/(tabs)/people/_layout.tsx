import { Stack } from "expo-router";

import { useStackHeader } from "@/navigation/stack-header";

// The people tab shows its title in the native header, so it needs its own stack.
export default function PeopleLayout() {
  const header = useStackHeader();

  return <Stack screenOptions={header} />;
}
