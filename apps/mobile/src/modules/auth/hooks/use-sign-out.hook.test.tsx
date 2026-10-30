import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { act, renderHook } from "@testing-library/react-native";
import { ReactNode } from "react";

import { SessionProvider, useSession } from "@/providers/session";
import {
  clearRegisteredPushToken,
  setRegisteredPushToken,
} from "@/services/push/push.service";

import { useSignOut } from "./use-sign-out.hook";

const fetchMock = jest.fn();

const user = {
  id: "user-1",
  name: "Ana Silva",
  email: "ana.silva@gmail.com",
  role: "student",
  status: "pending",
  createdAt: "2026-10-10T12:00:00.000Z",
  photoUrl: null,
  whatsappNumber: null,
  whatsappVisible: false,
  rulesAccepted: false,
  rulesAcceptedBefore: false,
  denialReason: null,
  reactivationStatus: null,
};

const tokens = {
  accessToken: "at-1",
  accessTokenExpiresAt: "2099-10-10T12:15:00.000Z",
  refreshToken: "rt-1",
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
};

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <SessionProvider>{children}</SessionProvider>
  </QueryClientProvider>
);

const renderSignedIn = async (signedIn = true) => {
  const hook = await renderHook(
    () => ({ session: useSession(), signOut: useSignOut() }),
    { wrapper },
  );

  if (signedIn) {
    await act(async () =>
      hook.result.current.session.setSession({ user, tokens }),
    );
  }

  return hook;
};

beforeEach(() => {
  clearRegisteredPushToken();
  queryClient = new QueryClient();
  fetchMock.mockReset();
  jest.mocked(GoogleSignin.signOut).mockReset().mockResolvedValue(null);
  fetchMock.mockResolvedValue({
    ok: true,
    status: 204,
    json: async () => ({}),
  });
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("useSignOut", () => {
  it("clears the session and the query cache", async () => {
    queryClient.setQueryData(["me"], { id: "user-1" });
    const { result } = await renderSignedIn();

    await act(async () => result.current.signOut.signOut());

    expect(result.current.session.user).toBeNull();
    expect(result.current.session.tokens).toBeNull();
    expect(queryClient.getQueryData(["me"])).toBeUndefined();
  });

  it("sends the refresh token to sign-out", async () => {
    const { result } = await renderSignedIn();

    await act(async () => result.current.signOut.signOut());

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/auth/sign-out",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refreshToken: "rt-1" }),
      }),
    );
  });

  it("sends the registered push token to sign-out", async () => {
    setRegisteredPushToken("ExponentPushToken[abc]");
    const { result } = await renderSignedIn();

    await act(async () => result.current.signOut.signOut());

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/auth/sign-out",
      expect.objectContaining({
        body: JSON.stringify({
          refreshToken: "rt-1",
          pushToken: "ExponentPushToken[abc]",
        }),
      }),
    );
  });

  it("clears the session at once, before the request answers", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    const { result } = await renderSignedIn();

    await act(async () => result.current.signOut.signOut());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.session.user).toBeNull();
  });

  it("ignores a network error", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));
    const { result } = await renderSignedIn();

    await act(async () => result.current.signOut.signOut());

    expect(result.current.session.user).toBeNull();
  });

  it("ignores a server error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ errors: ["INTERNAL_SERVER_ERROR"] }),
    });
    const { result } = await renderSignedIn();

    await act(async () => result.current.signOut.signOut());

    expect(result.current.session.user).toBeNull();
  });

  it("sends nothing without tokens", async () => {
    const { result } = await renderSignedIn(false);

    await act(async () => result.current.signOut.signOut());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.session.user).toBeNull();
  });

  describe("Google", () => {
    it("signs out of Google without waiting for it", async () => {
      jest.mocked(GoogleSignin.signOut).mockReturnValue(new Promise(() => {}));
      const { result } = await renderSignedIn();

      await act(async () => result.current.signOut.signOut());

      expect(GoogleSignin.signOut).toHaveBeenCalledTimes(1);
      expect(result.current.session.user).toBeNull();
    });

    it("ignores a Google failure: the session is cleared and the backend is still told", async () => {
      jest
        .mocked(GoogleSignin.signOut)
        .mockRejectedValue(new Error("native module failed"));
      const { result } = await renderSignedIn();

      await act(async () => result.current.signOut.signOut());

      expect(result.current.session.user).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("signs out of Google without tokens too, and sends no API request", async () => {
      const { result } = await renderSignedIn(false);

      await act(async () => result.current.signOut.signOut());

      expect(GoogleSignin.signOut).toHaveBeenCalledTimes(1);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
