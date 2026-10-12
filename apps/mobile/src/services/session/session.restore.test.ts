import * as SecureStore from "expo-secure-store";

import type { SessionUser } from "@/navigation/resolve-flow.types";

import { restoreSession } from "./session.restore";
import { writeStoredSession } from "./session.storage";
import * as store from "./session.store";
import type { Session } from "./session.types";

const stored = (expiresInMs = 600_000): Session => ({
  user: { id: "user-1", role: "student", status: "pending" } as SessionUser,
  tokens: {
    accessToken: "at-1",
    accessTokenExpiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    refreshToken: "rt-1",
    refreshTokenExpiresAt: "2099-01-01T00:00:00.000Z",
  },
});

const approved = { id: "user-1", role: "student", status: "approved" };

const answer = (status: number, body: unknown = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const fetchMock = jest.fn();

beforeEach(async () => {
  store.clearSession();
  store.acknowledgeExpired();
  store.finishRestoring(null);
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
  await new Promise<void>((resolve) => setImmediate(resolve));
  jest.mocked(SecureStore.deleteItemAsync).mockClear();
});

describe("restoreSession", () => {
  it("starts signed out with nothing stored", async () => {
    await restoreSession();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toMatchObject({
      session: null,
      restoring: false,
    });
  });

  it("restores the stored session and reloads the account", async () => {
    await writeStoredSession(stored());
    fetchMock.mockResolvedValue(answer(200, approved));

    await restoreSession();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/auth/me",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer at-1" },
      }),
    );
    expect(store.getSession()?.user).toEqual(approved);
    expect(store.getSnapshot().restoring).toBe(false);
    expect(
      JSON.parse((await SecureStore.getItemAsync("session.user")) ?? "null"),
    ).toEqual(approved);
  });

  it("renews an expired access token before reloading the account", async () => {
    await writeStoredSession(stored(-1000));
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/auth/refresh")
        ? answer(200, {
            accessToken: "at-2",
            accessTokenExpiresAt: "2099-01-01T00:15:00.000Z",
            refreshToken: "rt-2",
            refreshTokenExpiresAt: "2099-01-01T00:00:00.000Z",
            user: { id: "user-1", role: "student", status: "pending" },
          })
        : answer(200, approved),
    );

    await restoreSession();

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://api.test/auth/refresh",
      "http://api.test/auth/me",
    ]);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(
      "Bearer at-2",
    );
    expect(store.getSession()?.user).toEqual(approved);
  });

  it("keeps the stored session when offline", async () => {
    const session = stored();
    await writeStoredSession(session);
    fetchMock.mockRejectedValue(new TypeError("offline"));

    await restoreSession();

    expect(store.getSession()).toEqual(session);
    expect(store.getSnapshot()).toMatchObject({
      restoring: false,
      expired: false,
    });
  });

  it("keeps the stored session on a timeout", async () => {
    jest.useFakeTimers();
    const session = stored();
    await writeStoredSession(session);
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => reject(new Error("x")));
        }),
    );

    const restoring = restoreSession();
    await jest.advanceTimersByTimeAsync(8000);
    await restoring;
    jest.useRealTimers();

    expect(store.getSession()).toEqual(session);
    expect(store.getSnapshot().restoring).toBe(false);
  });

  it.each([500, 503])(
    "keeps the stored session on a server error (%s)",
    async (status) => {
      const session = stored();
      await writeStoredSession(session);
      fetchMock.mockResolvedValue(answer(status));

      await restoreSession();

      expect(store.getSession()).toEqual(session);
    },
  );

  it("keeps the stored session when the launch refresh is throttled", async () => {
    const session = stored(-1000);
    await writeStoredSession(session);
    fetchMock.mockResolvedValue(answer(429));

    await restoreSession();

    expect(store.getSession()).toEqual(session);
    expect(store.getSnapshot().expired).toBe(false);
  });

  it("expires the session when the refresh is refused", async () => {
    await writeStoredSession(stored(-1000));
    fetchMock.mockResolvedValue(
      answer(401, { errors: ["auth.refreshToken.invalid"] }),
    );

    await restoreSession();

    expect(store.getSnapshot()).toMatchObject({
      session: null,
      expired: true,
      restoring: false,
    });
    expect(await SecureStore.getItemAsync("session.tokens")).toBeNull();
    expect(await SecureStore.getItemAsync("session.user")).toBeNull();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://api.test/auth/refresh",
    ]);
  });

  it("expires the session when /auth/me is refused and the renewal too", async () => {
    await writeStoredSession(stored());
    fetchMock
      .mockResolvedValueOnce(answer(401, { errors: ["auth.token.invalid"] }))
      .mockResolvedValueOnce(
        answer(401, { errors: ["auth.refreshToken.invalid"] }),
      );

    await restoreSession();

    expect(store.getSnapshot()).toMatchObject({ session: null, expired: true });
  });
});
