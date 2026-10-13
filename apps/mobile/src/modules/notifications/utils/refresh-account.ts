import type { SessionUser } from "@/navigation/resolve-flow.types";
import { apiGet, SessionExpiredError } from "@/services/api";
import { updateUser } from "@/services/session/session.store";

/**
 * Reloads the signed-in account (`GET /auth/me`) into the session, so the route guards move the app to its new
 * flow at once. Returns the account, or null when the call failed (offline, 5xx…): the screen stays as it was.
 * An expired session is rethrown, since `useSessionExpired` owns that case.
 */
export const refreshAccount = async (): Promise<SessionUser | null> => {
  try {
    const user = await apiGet<SessionUser>("/auth/me", { authenticated: true });

    updateUser(user);

    return user;
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      throw error;
    }

    return null;
  }
};
