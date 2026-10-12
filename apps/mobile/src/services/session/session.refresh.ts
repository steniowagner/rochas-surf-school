import type { SessionUser } from "@/navigation/resolve-flow.types";

import { ApiError, NetworkError, SessionExpiredError } from "../api/api.errors";
import { rawRequest } from "../api/api.request";

import {
  commitRefreshedSession,
  expireSession,
  getGeneration,
  getRefreshInFlight,
  getSession,
  setRefreshInFlight,
} from "./session.store";
import type { Session } from "./session.types";

// An access token this close to its end (or past it) is renewed before the request goes out (D-04).
const RENEW_MARGIN_MS = 60_000;

type RefreshOptions = { timeoutMs?: number };

type RefreshResponse = Session["tokens"] & { user: SessionUser };

// Only a verdict on the refresh token ends the session: a 429 is a throttle, not a verdict (D-07).
const isRefusal = (error: unknown) =>
  error instanceof ApiError &&
  error.status >= 400 &&
  error.status < 500 &&
  error.status !== 429;

const runRefresh = async (
  { tokens }: Session,
  startedAt: number,
  { timeoutMs }: RefreshOptions,
): Promise<Session> => {
  let response: RefreshResponse;

  try {
    response = await rawRequest<RefreshResponse>(
      "POST",
      "/auth/refresh",
      { refreshToken: tokens.refreshToken },
      { timeoutMs },
    );
  } catch (error) {
    if (isRefusal(error)) {
      // A person who signed out meanwhile has nothing left to expire.
      if (startedAt === getGeneration()) {
        expireSession();
      }

      throw new SessionExpiredError();
    }

    throw new NetworkError();
  }

  const session: Session = {
    user: response.user,
    tokens: {
      accessToken: response.accessToken,
      accessTokenExpiresAt: response.accessTokenExpiresAt,
      refreshToken: response.refreshToken,
      refreshTokenExpiresAt: response.refreshTokenExpiresAt,
    },
  };

  commitRefreshedSession(startedAt, session);

  return session;
};

/** Renews the session, one refresh at a time: every caller that needs one awaits the same promise (D-06). */
export const refreshSession = (
  options: RefreshOptions = {},
): Promise<Session> => {
  const running = getRefreshInFlight();

  if (running) {
    return running;
  }

  const session = getSession();

  if (!session) {
    return Promise.reject(new SessionExpiredError());
  }

  const promise: Promise<Session> = runRefresh(
    session,
    getGeneration(),
    options,
  ).finally(() => {
    if (getRefreshInFlight() === promise) {
      setRefreshInFlight(null);
    }
  });

  setRefreshInFlight(promise);

  return promise;
};

/** The access token to send: the current one, or a renewed one when it is about to expire. */
export const getAccessToken = async (
  options: RefreshOptions = {},
): Promise<string | undefined> => {
  const session = getSession();

  if (!session) {
    return undefined;
  }

  const expiresAt = Date.parse(session.tokens.accessTokenExpiresAt);

  if (expiresAt - Date.now() >= RENEW_MARGIN_MS) {
    return session.tokens.accessToken;
  }

  return (await refreshSession(options)).tokens.accessToken;
};
