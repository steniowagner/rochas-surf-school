import { useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/providers/session";
import { apiPost } from "@/services/api";
import { GoogleSignin } from "@/services/google-sign-in";

/** Signing out is local first and always works, offline included: the backend call is fire-and-forget (D-03). */
export const useSignOut = () => {
  const { tokens, clearSession } = useSession();
  const queryClient = useQueryClient();

  const signOut = () => {
    const refreshToken = tokens?.refreshToken;

    clearSession();
    queryClient.clear();

    // So the next Google sign-in shows the account picker instead of reusing this account. Not awaited, like the call below.
    GoogleSignin.signOut().catch(() => {});

    if (refreshToken) {
      apiPost("/auth/sign-out", { refreshToken }).catch(() => {});
    }
  };

  return { signOut };
};
