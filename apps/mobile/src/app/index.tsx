import { Redirect } from "expo-router";

// The app opens on the sign-in screen until there is a signed-in area to route to.
export default function Index() {
  return <Redirect href="/auth" />;
}
