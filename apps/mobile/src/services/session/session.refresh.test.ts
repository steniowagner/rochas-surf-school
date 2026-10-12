import type { SessionUser } from "@/navigation/resolve-flow.types";

import { NetworkError, SessionExpiredError } from "../api/api.errors";

import { getAccessToken, refreshSession } from "./session.refresh";
import * as store from "./session.store";
import type { Session } from "./session.types";

const user = { id: "user-1", role: "student" } as SessionUser;
const renewedUser = { id: "user-1", role: "instructor" } as SessionUser;

const sessionExpiringIn = (ms: number): Session => ({
  user,
  tokens: {
    accessToken: "at-1",
    accessTokenExpiresAt: new Date(Date.now() + ms).toISOString(),
    refreshToken: "rt-1",
    refreshTokenExpiresAt: "2099-01-01T00:00:00.000Z",
  },
});

const renewedBody = {
  accessToken: "at-2",
  accessTokenExpiresAt: "2099-01-01T00:15:00.000Z",
  refreshToken: "rt-2",
  refreshTokenExpiresAt: "2099-01-01T00:00:00.000Z",
  user: renewedUser,
};

const answer = (status: number, body: unknown = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const fetchMock = jest.fn();

beforeEach(() => {
  store.clearSession();
  store.acknowledgeExpired();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("getAccessToken", () => {
  it("returns nothing without a session", async () => {
    expect(await getAccessToken()).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps a token valid for more than 60 seconds", async () => {
    store.setSession(sessionExpiringIn(120_000));

    expect(await getAccessToken()).toBe("at-1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renews a token that expires within 60 seconds", async () => {
    store.setSession(sessionExpiringIn(30_000));
    fetchMock.mockResolvedValue(answer(200, renewedBody));

    expect(await getAccessToken()).toBe("at-2");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/auth/refresh",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refreshToken: "rt-1" }),
      }),
    );
  });

  it("renews a token that already expired", async () => {
    store.setSession(sessionExpiringIn(-5_000));
    fetchMock.mockResolvedValue(answer(200, renewedBody));

    expect(await getAccessToken()).toBe("at-2");
  });
});

describe("refreshSession", () => {
  it("stores the renewed tokens and account", async () => {
    store.setSession(sessionExpiringIn(0));
    fetchMock.mockResolvedValue(answer(200, renewedBody));

    await refreshSession();

    expect(store.getSession()).toEqual({
      user: renewedUser,
      tokens: {
        accessToken: "at-2",
        accessTokenExpiresAt: renewedBody.accessTokenExpiresAt,
        refreshToken: "rt-2",
        refreshTokenExpiresAt: renewedBody.refreshTokenExpiresAt,
      },
    });
    expect(store.getRefreshInFlight()).toBeNull();
  });

  it("shares one refresh between concurrent callers", async () => {
    store.setSession(sessionExpiringIn(0));
    fetchMock.mockResolvedValue(answer(200, renewedBody));

    const tokens = await Promise.all([
      getAccessToken(),
      getAccessToken(),
      refreshSession(),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(tokens[0]).toBe("at-2");
    expect(tokens[1]).toBe("at-2");
    expect((tokens[2] as Session).tokens.accessToken).toBe("at-2");
  });

  it("starts a new refresh once the previous one settled", async () => {
    store.setSession(sessionExpiringIn(0));
    fetchMock.mockResolvedValue(answer(200, renewedBody));
    await refreshSession();
    await refreshSession();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("expires the session when the refresh is refused", async () => {
    store.setSession(sessionExpiringIn(0));
    fetchMock.mockResolvedValue(
      answer(401, { errors: ["auth.refreshToken.invalid"] }),
    );

    await expect(refreshSession()).rejects.toBeInstanceOf(SessionExpiredError);

    expect(store.getSession()).toBeNull();
    expect(store.getSnapshot().expired).toBe(true);
  });

  it("fails every waiting caller the same way", async () => {
    store.setSession(sessionExpiringIn(0));
    fetchMock.mockResolvedValue(answer(401));

    const results = await Promise.allSettled([
      refreshSession(),
      getAccessToken(),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    results.forEach((result) =>
      expect(result).toMatchObject({
        status: "rejected",
        reason: expect.any(SessionExpiredError),
      }),
    );
  });

  it("rejects without a session", async () => {
    await expect(refreshSession()).rejects.toBeInstanceOf(SessionExpiredError);
    expect(store.getSnapshot().expired).toBe(false);
  });

  it("keeps the session when the refresh fails to connect", async () => {
    const session = sessionExpiringIn(0);
    store.setSession(session);
    fetchMock.mockRejectedValue(new TypeError("offline"));

    await expect(refreshSession()).rejects.toBeInstanceOf(NetworkError);

    expect(store.getSession()).toEqual(session);
    expect(store.getSnapshot().expired).toBe(false);
  });

  it.each([500, 503, 429])(
    "keeps the session on a server error or 429 (%s)",
    async (status) => {
      const session = sessionExpiringIn(0);
      store.setSession(session);
      fetchMock.mockResolvedValue(answer(status));

      await expect(refreshSession()).rejects.toBeInstanceOf(NetworkError);

      expect(store.getSession()).toEqual(session);
      expect(store.getSnapshot().expired).toBe(false);
    },
  );

  it("tries again on the next request after a failure", async () => {
    store.setSession(sessionExpiringIn(0));
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    fetchMock.mockResolvedValueOnce(answer(200, renewedBody));

    await expect(refreshSession()).rejects.toBeInstanceOf(NetworkError);
    await expect(refreshSession()).resolves.toMatchObject({
      tokens: { accessToken: "at-2" },
    });
  });

  it("does not expire or restore a session that signed out meanwhile", async () => {
    store.setSession(sessionExpiringIn(0));
    let finish!: (value: unknown) => void;
    fetchMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    const refreshing = refreshSession();
    store.clearSession();
    finish(answer(401));

    await expect(refreshing).rejects.toBeInstanceOf(SessionExpiredError);
    expect(store.getSnapshot().expired).toBe(false);
  });

  it("never puts a refreshed session back after sign-out", async () => {
    store.setSession(sessionExpiringIn(0));
    let finish!: (value: unknown) => void;
    fetchMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    const refreshing = refreshSession();
    store.clearSession();
    finish(answer(200, renewedBody));
    await refreshing;

    expect(store.getSession()).toBeNull();
  });

  it("leaves a newer in-flight slot alone when an old refresh settles", async () => {
    store.setSession(sessionExpiringIn(0));
    let finish!: (value: unknown) => void;
    fetchMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    const refreshing = refreshSession();
    store.resetSessionStore();
    finish(answer(200, renewedBody));
    await refreshing;

    expect(store.getRefreshInFlight()).toBeNull();
    expect(store.getSession()).toBeNull();
  });
});
