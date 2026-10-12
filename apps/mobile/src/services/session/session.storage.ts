import * as SecureStore from "expo-secure-store";

import type { Session } from "./session.types";

const TOKENS_KEY = "session.tokens";
const USER_KEY = "session.user";

const safeDelete = async (key: string) => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // A failed delete must never block the launch or a sign-out.
  }
};

export const clearStoredSession = async (): Promise<void> => {
  await Promise.all([safeDelete(TOKENS_KEY), safeDelete(USER_KEY)]);
};

export const writeStoredSession = async ({
  user,
  tokens,
}: Session): Promise<void> => {
  try {
    await Promise.all([
      SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens)),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
  } catch {
    // The session stays in memory; it just won't survive a restart.
  }
};

/** Returns the stored session, or null (deleting both keys) when nothing usable is stored. */
export const readStoredSession = async (): Promise<Session | null> => {
  try {
    const [rawTokens, rawUser] = await Promise.all([
      SecureStore.getItemAsync(TOKENS_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);

    if (rawTokens === null && rawUser === null) {
      return null;
    }

    if (rawTokens !== null && rawUser !== null) {
      const tokens = JSON.parse(rawTokens);
      const user = JSON.parse(rawUser);

      if (tokens && user && typeof tokens.refreshToken === "string") {
        return { user, tokens };
      }
    }
  } catch {
    // Unreadable (e.g. a Keystore that can't decrypt) counts as no session.
  }

  await clearStoredSession();

  return null;
};
