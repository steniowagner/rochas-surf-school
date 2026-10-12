import type { SessionUser } from "@/navigation/resolve-flow.types";

import { apiGet } from "../api/api.client";

import { readStoredSession } from "./session.storage";
import { finishRestoring, hydrateSession, updateUser } from "./session.store";

// A launch request that hangs must not keep the splash screen up forever (D-09).
const RESTORE_TIMEOUT_MS = 8000;

/**
 * Reads the stored session and reloads the account while the splash screen is up. Only a refused refresh
 * ends the session; being offline or a backend outage keeps the stored one, so the person is routed by the
 * last known account.
 */
export const restoreSession = async (): Promise<void> => {
  try {
    const stored = await readStoredSession();

    if (!stored) {
      return;
    }

    hydrateSession(stored);

    try {
      const user = await apiGet<SessionUser>("/auth/me", {
        authenticated: true,
        timeoutMs: RESTORE_TIMEOUT_MS,
      });

      updateUser(user);
    } catch {
      // Expired: the store already cleared it and raised the notice. Anything else: keep the stored session.
    }
  } finally {
    finishRestoring();
  }
};
