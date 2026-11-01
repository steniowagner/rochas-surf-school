import { useSession } from "@/providers/session";

import { AuthComponent } from "../components/auth";
import { useGoogleSignIn } from "../hooks/use-google-sign-in.hook";
import { useLegalPages } from "../hooks/use-legal-pages.hook";

export function AuthScreen() {
  const { setSession } = useSession();
  const legalPages = useLegalPages();
  const { signInWithGoogle, isLoading } = useGoogleSignIn({
    // The account and its tokens enter the session, and the route guards open its flow.
    onSignedIn: ({ user, ...tokens }) => setSession({ user, tokens }),
  });

  return (
    <AuthComponent
      {...legalPages}
      onGooglePress={signInWithGoogle}
      isGoogleLoading={isLoading}
    />
  );
}
