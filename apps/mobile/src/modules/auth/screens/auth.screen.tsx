import { useSession } from "@/providers/session";

import { AuthComponent } from "../components/auth";
import { useAppleSignIn } from "../hooks/use-apple-sign-in.hook";
import { useGoogleSignIn } from "../hooks/use-google-sign-in.hook";
import { useLegalPages } from "../hooks/use-legal-pages.hook";
import { SignInWithGoogleResponse } from "../hooks/use-sign-in-with-google.hook";

export function AuthScreen() {
  const { setSession } = useSession();
  const legalPages = useLegalPages();
  // The account and its tokens enter the session, and the route guards open its flow.
  const onSignedIn = ({ user, ...tokens }: SignInWithGoogleResponse) =>
    setSession({ user, tokens });
  const { signInWithGoogle, isLoading: isGoogleLoading } = useGoogleSignIn({
    onSignedIn,
  });
  const { signInWithApple, isLoading: isAppleLoading } = useAppleSignIn({
    onSignedIn,
  });

  return (
    <AuthComponent
      {...legalPages}
      onApplePress={signInWithApple}
      isAppleLoading={isAppleLoading}
      onGooglePress={signInWithGoogle}
      isGoogleLoading={isGoogleLoading}
    />
  );
}
