import { useLocalSearchParams } from "expo-router";

import { useSession } from "@/providers/session";

import { GoogleName } from "../components/google-name";

export function GoogleNameScreen() {
  const { setSession } = useSession();
  const { idToken, name } = useLocalSearchParams<{
    idToken: string;
    name?: string;
  }>();

  // The account and its tokens enter the session, and the route guards open its flow.
  return (
    <GoogleName
      idToken={idToken}
      initialName={name || undefined}
      onSignedIn={({ user, ...tokens }) => setSession({ user, tokens })}
    />
  );
}
