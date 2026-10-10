import { useLocalSearchParams } from "expo-router";

import { useSession } from "@/providers/session";

import { ConfirmCode } from "../components/confirm-code";

export function ConfirmCodeScreen() {
  const { setSession } = useSession();
  // Create account sets both params; Sign in with email sets only the email.
  const { email, name } = useLocalSearchParams<{
    email: string;
    name?: string;
  }>();

  // The verified account and its tokens enter the session, and the route guards open its flow.
  return (
    <ConfirmCode
      email={email}
      name={name || undefined}
      onVerified={({ user, ...tokens }) => setSession({ user, tokens })}
    />
  );
}
