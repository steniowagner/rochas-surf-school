import * as SecureStore from "expo-secure-store";

import type { SessionUser } from "@/navigation/resolve-flow.types";

import {
  clearRegisteredPushToken,
  getRegisteredPushToken,
  setRegisteredPushToken,
} from "../push/push.service";

import * as store from "./session.store";
import type { Session } from "./session.types";

const user = { id: "user-1", email: "ana@gmail.com" } as SessionUser;

const tokensOf = (n: number) => ({
  accessToken: `at-${n}`,
  accessTokenExpiresAt: "2026-10-10T12:15:00.000Z",
  refreshToken: `rt-${n}`,
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
});

const sessionOf = (n: number): Session => ({ user, tokens: tokensOf(n) });

const fetchMock = jest.fn();

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

beforeEach(() => {
  clearRegisteredPushToken();
  store.clearSession();
  store.acknowledgeExpired();
  store.setRefreshInFlight(null);
  fetchMock.mockReset().mockResolvedValue({
    ok: true,
    status: 204,
    json: async () => ({}),
  });
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
  jest.mocked(SecureStore.deleteItemAsync).mockClear();
});

describe("session store", () => {
  it("resets to the state of a fresh launch", () => {
    store.setSession(sessionOf(1));
    store.resetSessionStore();

    expect(store.getSnapshot()).toEqual({
      session: null,
      restoring: true,
      expired: false,
    });
  });

  it("notifies subscribers and stops after unsubscribe", () => {
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    store.setSession(sessionOf(1));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().session).toEqual(sessionOf(1));

    unsubscribe();
    store.setSession(sessionOf(2));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("writes the session through to storage", async () => {
    store.setSession(sessionOf(1));
    await flush();

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "session.tokens",
      JSON.stringify(tokensOf(1)),
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "session.user",
      JSON.stringify(user),
    );
  });

  it("hydrates a stored session without writing it back", async () => {
    store.hydrateSession(sessionOf(1));
    await flush();

    expect(store.getSession()).toEqual(sessionOf(1));
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it("updates the user and keeps the tokens", () => {
    store.setSession(sessionOf(1));
    const updated = { ...user, name: "Ana" } as SessionUser;

    store.updateUser(updated);

    expect(store.getSession()).toEqual({ user: updated, tokens: tokensOf(1) });
  });

  it("ignores updateUser without a session", () => {
    store.updateUser(user);

    expect(store.getSession()).toBeNull();
  });

  it("clears the session and the stored keys", async () => {
    store.setSession(sessionOf(1));
    store.clearSession();
    await flush();

    expect(store.getSession()).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("session.tokens");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("session.user");
  });

  it("finishes restoring with or without a session", () => {
    store.finishRestoring(sessionOf(1));
    expect(store.getSnapshot()).toMatchObject({
      restoring: false,
      session: sessionOf(1),
    });

    store.finishRestoring();
    expect(store.getSnapshot().session).toEqual(sessionOf(1));
  });

  it("expires the session until the notice is acknowledged", () => {
    store.setSession(sessionOf(1));
    store.expireSession();

    expect(store.getSnapshot()).toMatchObject({ session: null, expired: true });

    store.acknowledgeExpired();
    expect(store.getSnapshot().expired).toBe(false);

    const listener = jest.fn();
    store.subscribe(listener);
    store.acknowledgeExpired();
    expect(listener).not.toHaveBeenCalled();
  });

  it("commits a refreshed session only from the current generation", () => {
    store.setSession(sessionOf(1));
    const startedAt = store.getGeneration();

    expect(store.commitRefreshedSession(startedAt, sessionOf(2))).toBe(true);
    expect(store.getSession()).toEqual(sessionOf(2));

    store.clearSession();
    expect(store.commitRefreshedSession(startedAt, sessionOf(3))).toBe(false);
    expect(store.getSession()).toBeNull();
  });

  describe("signOut", () => {
    it("clears at once and sends the current refresh token", async () => {
      store.setSession(sessionOf(1));

      await store.signOut();

      expect(store.getSession()).toBeNull();
      expect(fetchMock).toHaveBeenCalledWith(
        "http://api.test/auth/sign-out",
        expect.objectContaining({
          body: JSON.stringify({ refreshToken: "rt-1" }),
        }),
      );
    });

    it("sends the registered push token on sign-out, once", async () => {
      store.setSession(sessionOf(1));
      setRegisteredPushToken("ExponentPushToken[abc]");

      await store.signOut();

      expect(fetchMock.mock.calls[0][1].body).toBe(
        JSON.stringify({
          refreshToken: "rt-1",
          pushToken: "ExponentPushToken[abc]",
        }),
      );
      expect(getRegisteredPushToken()).toBeNull();

      store.setSession(sessionOf(2));
      await store.signOut();

      expect(fetchMock.mock.calls[1][1].body).toBe(
        JSON.stringify({ refreshToken: "rt-2" }),
      );
    });

    it("sends the push token with the newest refresh token when a refresh is running", async () => {
      store.setSession(sessionOf(1));
      setRegisteredPushToken("ExponentPushToken[abc]");
      store.setRefreshInFlight(Promise.resolve(sessionOf(2)));

      await store.signOut();

      expect(fetchMock.mock.calls[0][1].body).toBe(
        JSON.stringify({
          refreshToken: "rt-2",
          pushToken: "ExponentPushToken[abc]",
        }),
      );
    });

    it("forgets the registered push token even without a session", async () => {
      setRegisteredPushToken("ExponentPushToken[abc]");

      await store.signOut();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(getRegisteredPushToken()).toBeNull();
    });

    it("sends nothing without a session", async () => {
      await store.signOut();

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("ignores a failed request", async () => {
      fetchMock.mockRejectedValue(new TypeError("offline"));
      store.setSession(sessionOf(1));

      await expect(store.signOut()).resolves.toBeUndefined();
    });

    it("signs out with the token of the running refresh", async () => {
      store.setSession(sessionOf(1));
      let finish!: (session: Session) => void;
      store.setRefreshInFlight(
        new Promise<Session>((resolve) => {
          finish = resolve;
        }),
      );

      const done = store.signOut();
      await flush();

      expect(store.getSession()).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();

      finish(sessionOf(2));
      await done;

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][1].body).toBe(
        JSON.stringify({ refreshToken: "rt-2" }),
      );
    });

    it("signs out with the token it had when the refresh fails", async () => {
      store.setSession(sessionOf(1));
      store.setRefreshInFlight(Promise.reject(new Error("offline")));

      await store.signOut();

      expect(fetchMock.mock.calls[0][1].body).toBe(
        JSON.stringify({ refreshToken: "rt-1" }),
      );
    });

    it("ignores a refresh that finishes after sign-out", async () => {
      store.setSession(sessionOf(1));
      const startedAt = store.getGeneration();

      await store.signOut();

      expect(store.commitRefreshedSession(startedAt, sessionOf(2))).toBe(false);
      expect(store.getSession()).toBeNull();
    });
  });
});
