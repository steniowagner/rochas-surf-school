import { Stack } from "expo-router";

import { useStackHeader } from "@/navigation/stack-header";

// The school tab shows the people screen under the native header, so it needs its own stack.
export default function SchoolLayout() {
  const header = useStackHeader();

  return <Stack screenOptions={header} />;
}
