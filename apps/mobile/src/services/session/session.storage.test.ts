import * as SecureStore from "expo-secure-store";

import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from "./session.storage";
import type { Session } from "./session.types";

const session = {
  user: { id: "user-1", email: "ana@gmail.com" },
  tokens: {
    accessToken: "access-1",
    accessTokenExpiresAt: "2026-10-10T12:15:00.000Z",
    refreshToken: "refresh-1",
    refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
  },
} as unknown as Session;

const store = jest.mocked(SecureStore);

describe("session.storage", () => {
  it("writes and reads the session", async () => {
    await writeStoredSession(session);

    expect(await readStoredSession()).toEqual(session);
  });

  it("returns null with nothing stored, without deleting", async () => {
    expect(await readStoredSession()).toBeNull();
    expect(store.deleteItemAsync).not.toHaveBeenCalled();
  });

  it("treats an unreadable session as none", async () => {
    store.getItemAsync.mockRejectedValueOnce(new Error("keystore"));

    expect(await readStoredSession()).toBeNull();
    expect(store.deleteItemAsync).toHaveBeenCalledWith("session.tokens");
    expect(store.deleteItemAsync).toHaveBeenCalledWith("session.user");
  });

  it("treats malformed JSON as none", async () => {
    await store.setItemAsync("session.tokens", "{nope");
    await store.setItemAsync("session.user", "{}");

    expect(await readStoredSession()).toBeNull();
    expect(store.deleteItemAsync).toHaveBeenCalledTimes(2);
  });

  it("treats a session without a refresh token as none", async () => {
    await store.setItemAsync("session.tokens", "{}");
    await store.setItemAsync("session.user", "{}");

    expect(await readStoredSession()).toBeNull();
  });

  it("treats a half-written session as none", async () => {
    await store.setItemAsync("session.tokens", JSON.stringify(session.tokens));

    expect(await readStoredSession()).toBeNull();
    expect(store.deleteItemAsync).toHaveBeenCalledWith("session.tokens");
    expect(store.deleteItemAsync).toHaveBeenCalledWith("session.user");
  });

  it("does not block when deleting fails", async () => {
    store.deleteItemAsync.mockRejectedValue(new Error("boom"));

    await expect(clearStoredSession()).resolves.toBeUndefined();

    store.deleteItemAsync.mockImplementation(async () => {});
  });

  it("does not throw when writing fails", async () => {
    store.setItemAsync.mockRejectedValueOnce(new Error("boom"));

    await expect(writeStoredSession(session)).resolves.toBeUndefined();
  });
});
