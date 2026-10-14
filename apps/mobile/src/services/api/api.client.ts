import { getAccessToken, refreshSession } from "../session/session.refresh";
import { expireSession, getSession } from "../session/session.store";

import { ApiError, SessionExpiredError } from "./api.errors";
import { rawRequest } from "./api.request";

type RequestOptions = {
  /** Sends the session's access token, renewed first when it is about to expire, and once more after a 401. */
  authenticated?: true;
  /** Aborts the request after this many milliseconds (as a `NetworkError`). */
  timeoutMs?: number;
};

type Method = "GET" | "POST" | "PUT" | "DELETE";

// The backend answers this key for every guard 401 (expired token, unknown user…).
const isInvalidToken = (error: unknown) =>
  error instanceof ApiError &&
  error.status === 401 &&
  error.errors.includes("auth.token.invalid");

const request = async <T>(
  method: Method,
  path: string,
  body: unknown,
  { authenticated, timeoutMs }: RequestOptions = {},
): Promise<T> => {
  if (!authenticated) {
    return rawRequest<T>(method, path, body, { timeoutMs });
  }

  const token = await getAccessToken({ timeoutMs });

  try {
    return await rawRequest<T>(method, path, body, {
      accessToken: token,
      timeoutMs,
    });
  } catch (error) {
    if (!isInvalidToken(error)) {
      throw error;
    }
  }

  const renewed = await refreshSession({ timeoutMs });

  try {
    return await rawRequest<T>(method, path, body, {
      accessToken: renewed.tokens.accessToken,
      timeoutMs,
    });
  } catch (error) {
    if (!isInvalidToken(error)) {
      throw error;
    }

    // Renewing didn't help: the session is over, unless the person already signed out.
    if (getSession()) {
      expireSession();
    }

    throw new SessionExpiredError();
  }
};

/** A POST; `authenticated: true` sends the session's access token. */
export const apiPost = <T>(
  path: string,
  body: unknown,
  options?: RequestOptions,
): Promise<T> => request<T>("POST", path, body, options);

/** A PUT; `authenticated: true` sends the session's access token (spec 008, D-10). */
export const apiPut = <T>(
  path: string,
  body: unknown,
  options?: RequestOptions,
): Promise<T> => request<T>("PUT", path, body, options);

/** A GET; `authenticated: true` sends the session's access token (spec 012). */
export const apiGet = <T>(path: string, options?: RequestOptions): Promise<T> =>
  request<T>("GET", path, undefined, options);

/** A DELETE with a JSON body; `authenticated: true` sends the session's access token (spec 026, D-10). */
export const apiDelete = <T>(
  path: string,
  body: unknown,
  options?: RequestOptions,
): Promise<T> => request<T>("DELETE", path, body, options);
