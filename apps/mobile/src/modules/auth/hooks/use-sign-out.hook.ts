import { useQueryClient } from "@tanstack/react-query";

import { GoogleSignin } from "@/services/google-sign-in";
import { signOut as signOutSession } from "@/services/session/session.store";

/**
 * Signing out is local first and always works, offline included: the session and its stored copy go at once and
 * the backend call is fire-and-forget. It waits for a refresh in flight so the backend is told the newest token
 * (spec 018, D-10).
 */
export const useSignOut = () => {
  const queryClient = useQueryClient();

  const signOut = () => {
    void signOutSession();
    queryClient.clear();

    // So the next Google sign-in shows the account picker instead of reusing this account. Not awaited, like the call above.
    GoogleSignin.signOut().catch(() => {});
  };

  return { signOut };
};
