import { Redirect } from "expo-router";

import { flowEntryRoute } from "@/navigation/resolve-flow";
import { useRootNavigator } from "@/navigation/root-navigator/root-navigator.hook";
import { useSession } from "@/providers/session";

// Every landing goes through the resolver: the app opens on the entry screen of the account's flow (D-10).
export default function Index() {
  const flow = useRootNavigator();
  const { user } = useSession();

  return <Redirect href={flowEntryRoute(flow, user)} />;
}
