import { useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/providers/session";
import { apiPost } from "@/services/api";

/** Signing out is local first and always works, offline included: the backend call is fire-and-forget (D-03). */
export const useSignOut = () => {
  const { tokens, clearSession } = useSession();
  const queryClient = useQueryClient();

  const signOut = () => {
    const refreshToken = tokens?.refreshToken;

    clearSession();
    queryClient.clear();

    if (refreshToken) {
      apiPost("/auth/sign-out", { refreshToken }).catch(() => {});
    }
  };

  return { signOut };
};
