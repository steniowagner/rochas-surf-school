import { useLocalSearchParams } from "expo-router";

import { useSession } from "@/providers/session";

import { ProviderName } from "../components/provider-name";
import { NameProvider } from "../components/provider-name/provider-name.types";

export function ProviderNameScreen() {
  const { setSession } = useSession();
  const { provider, idToken, name } = useLocalSearchParams<{
    provider: NameProvider;
    idToken: string;
    name?: string;
  }>();

  // The account and its tokens enter the session, and the route guards open its flow.
  return (
    <ProviderName
      provider={provider}
      idToken={idToken}
      initialName={name || undefined}
      onSignedIn={({ user, ...tokens }) => setSession({ user, tokens })}
    />
  );
}
