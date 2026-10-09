import { Redirect } from "expo-router";

import { routes } from "@/constants/routes";

// The app opens on the sign-in screen until there is a signed-in area to route to.
export default function Index() {
  return <Redirect href={routes.auth.signIn} />;
}
