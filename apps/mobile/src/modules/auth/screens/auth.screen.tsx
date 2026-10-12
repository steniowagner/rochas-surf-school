import { useSession } from "@/providers/session";

import { AuthComponent } from "../components/auth";
import { useGoogleSignIn } from "../hooks/use-google-sign-in.hook";

export function AuthScreen() {
  const { setSession } = useSession();
  const { signInWithGoogle, isLoading } = useGoogleSignIn({
    // The account and its tokens enter the session, and the route guards open its flow.
    onSignedIn: ({ user, ...tokens }) => setSession({ user, tokens }),
  });

  return (
    <AuthComponent
      onGooglePress={signInWithGoogle}
      isGoogleLoading={isLoading}
    />
  );
}
