import type { SessionUser } from "@/navigation/resolve-flow.types";

import { rawRequest } from "../api/api.request";

import { clearStoredSession, writeStoredSession } from "./session.storage";
import type { Session } from "./session.types";
export type SessionState = {
  session: Session | null;
  // True from launch until the stored session was read (and its account reloaded).
  restoring: boolean;
  // Set when the session ended because the backend refused to renew it; the UI consumes it (D-08).
  expired: boolean;
};

let state: SessionState = { session: null, restoring: true, expired: false };
// Bumped on every sign-out or expiry, so a refresh that started before it never writes the session back (D-10).
let generation = 0;
let refreshInFlight: Promise<Session> | null = null;
const listeners = new Set<() => void>();

const setState = (patch: Partial<SessionState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

export const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const getSnapshot = () => state;

export const getSession = () => state.session;

export const getGeneration = () => generation;

export const getRefreshInFlight = () => refreshInFlight;

export const setRefreshInFlight = (promise: Promise<Session> | null) => {
  refreshInFlight = promise;
};

export const setSession = (session: Session) => {
  setState({ session });
  void writeStoredSession(session);
};

/** Puts a session read from storage in memory without writing it back. */
export const hydrateSession = (session: Session) => {
  setState({ session });
};

export const updateUser = (user: SessionUser) => {
  if (!state.session) {
    return;
  }

  setSession({ ...state.session, user });
};

/** Stores a refreshed session unless the person signed out while the refresh ran. */
export const commitRefreshedSession = (
  startedAt: number,
  session: Session,
): boolean => {
  if (startedAt !== generation) {
    return false;
  }

  setSession(session);

  return true;
};

export const finishRestoring = (session?: Session | null) => {
  setState({
    restoring: false,
    ...(session === undefined ? {} : { session }),
  });
};

export const clearSession = () => {
  generation += 1;
  setState({ session: null });
  void clearStoredSession();
};

export const expireSession = () => {
  clearSession();
  setState({ expired: true });
};

export const acknowledgeExpired = () => {
  if (state.expired) {
    setState({ expired: false });
  }
};

/**
 * Clears the session at once, then tells the backend with the newest refresh token: the one a running refresh
 * produced, so the backend never sees a reused token nor leaves the rotated one alive (D-10).
 */
export const signOut = async (): Promise<void> => {
  const refreshToken = state.session?.tokens.refreshToken;
  const inFlight = refreshInFlight;

  clearSession();

  if (!refreshToken) {
    return;
  }

  let newest = refreshToken;

  if (inFlight) {
    try {
      newest = (await inFlight).tokens.refreshToken;
    } catch {
      // A failed refresh leaves the token it had as the newest.
    }
  }

  await rawRequest("POST", "/auth/sign-out", { refreshToken: newest }).catch(
    () => {},
  );
};
