import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import { ReactNode } from "react";

import {
  expireSession,
  getSnapshot,
  setSession,
} from "@/services/session/session.store";

import { useSessionExpired } from "./use-session-expired.hook";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

const session = {
  user: { id: "user-1", role: "student", status: "approved" } as never,
  tokens: {
    accessToken: "at-1",
    accessTokenExpiresAt: "2026-10-10T12:15:00.000Z",
    refreshToken: "rt-1",
    refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
  },
};

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
  queryClient = new QueryClient();
  mockShow.mockReset();
  jest.mocked(GoogleSignin.signOut).mockReset().mockResolvedValue(null);
});

describe("useSessionExpired", () => {
  it("does nothing while the session is alive", async () => {
    await renderHook(() => useSessionExpired(), { wrapper });

    expect(mockShow).not.toHaveBeenCalled();
    expect(GoogleSignin.signOut).not.toHaveBeenCalled();
  });

  it("shows the message once and clears the cache", async () => {
    queryClient.setQueryData(["me"], { id: "user-1" });
    setSession(session);
    await renderHook(() => useSessionExpired(), { wrapper });

    await act(async () => expireSession());

    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith(
      "Your session expired. Sign in again.",
    );
    expect(queryClient.getQueryData(["me"])).toBeUndefined();
    expect(GoogleSignin.signOut).toHaveBeenCalledTimes(1);
    expect(getSnapshot().expired).toBe(false);
  });

  it("shows the message once however many calls expire it", async () => {
    setSession(session);
    await renderHook(() => useSessionExpired(), { wrapper });

    await act(async () => {
      expireSession();
      expireSession();
    });

    expect(mockShow).toHaveBeenCalledTimes(1);
  });

  it("shows the expired message raised before it mounted", async () => {
    setSession(session);
    expireSession();

    await renderHook(() => useSessionExpired(), { wrapper });

    expect(mockShow).toHaveBeenCalledWith(
      "Your session expired. Sign in again.",
    );
  });

  it("ignores a Google sign-out failure", async () => {
    jest.mocked(GoogleSignin.signOut).mockRejectedValue(new Error("native"));
    setSession(session);
    await renderHook(() => useSessionExpired(), { wrapper });

    await act(async () => expireSession());

    expect(mockShow).toHaveBeenCalledTimes(1);
  });

  it("sends no request to the backend", async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock;
    setSession(session);
    await renderHook(() => useSessionExpired(), { wrapper });

    await act(async () => expireSession());

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
