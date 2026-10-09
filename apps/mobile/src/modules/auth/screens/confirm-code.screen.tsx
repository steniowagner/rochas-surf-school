import { useLocalSearchParams } from "expo-router";

import { ConfirmCode } from "../components/confirm-code";

export function ConfirmCodeScreen() {
  // Create account always sets both params before opening this screen.
  const { email, name } = useLocalSearchParams<{
    email: string;
    name: string;
  }>();

  return <ConfirmCode email={email} name={name} />;
}
