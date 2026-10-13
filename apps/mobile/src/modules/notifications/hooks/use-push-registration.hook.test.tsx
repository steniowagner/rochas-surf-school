import { renderHook, waitFor } from "@testing-library/react-native";
import { ReactNode } from "react";

import i18n from "@/i18n";
import type { SessionUser } from "@/navigation/resolve-flow.types";
import { SessionProvider } from "@/providers/session";
import * as api from "@/services/api/api.client";
import * as push from "@/services/push/push.service";
import { hydrateSession } from "@/services/session/session.store";

import { usePushRegistration } from "./use-push-registration.hook";

jest.mock("@/services/api/api.client");
jest.mock("@/services/push/push.service");

const apiPut = jest.mocked(api.apiPut);
const getPushToken = jest.mocked(push.getPushToken);
const setRegisteredPushToken = jest.mocked(push.setRegisteredPushToken);

const user = (overrides: Partial<SessionUser> = {}): SessionUser => ({
  id: "user-1",
  name: "Ana",
  email: "ana@example.com",
  role: "student",
  status: "approved",
  createdAt: "2026-10-01T10:00:00.000Z",
  whatsappNumber: null,
  whatsappVisible: false,
  rulesAccepted: true,
  rulesAcceptedBefore: false,
  denialReason: null,
  reactivationStatus: null,
  ...overrides,
});

const seed = (account: SessionUser) =>
  hydrateSession({
    user: account,
    tokens: {
      accessToken: "access",
      accessTokenExpiresAt: "2099-10-10T12:15:00.000Z",
      refreshToken: "refresh",
      refreshTokenExpiresAt: "2099-11-10T12:00:00.000Z",
    },
  });

const wrapper = ({ children }: { children: ReactNode }) => (
  <SessionProvider>{children}</SessionProvider>
);

const mount = () => renderHook(() => usePushRegistration(), { wrapper });

describe("usePushRegistration", () => {
  beforeEach(() => {
    apiPut.mockReset().mockResolvedValue(undefined);
    getPushToken.mockReset().mockResolvedValue("ExponentPushToken[abc]");
    setRegisteredPushToken.mockReset();
  });

  it.each(["pending", "approved"])(
    "registers the token of a %s account with the app language",
    async (status) => {
      await i18n.changeLanguage("es-ES");
      seed(user({ status }));

      await mount();

      await waitFor(() => expect(apiPut).toHaveBeenCalledTimes(1));
      expect(apiPut).toHaveBeenCalledWith(
        "/notifications/push-token",
        { token: "ExponentPushToken[abc]", locale: "es" },
        { authenticated: true },
      );
      expect(setRegisteredPushToken).toHaveBeenCalledWith("ExponentPushToken[abc]");
    },
  );

  it.each(["denied", "deleted", "removed"])(
    "does nothing for a %s account",
    async (status) => {
      seed(user({ status }));

      await mount();

      expect(getPushToken).not.toHaveBeenCalled();
      expect(apiPut).not.toHaveBeenCalled();
    },
  );

  it("does nothing without a session", async () => {
    await mount();

    expect(getPushToken).not.toHaveBeenCalled();
    expect(apiPut).not.toHaveBeenCalled();
  });

  it("sends nothing when the phone has no token", async () => {
    getPushToken.mockResolvedValue(null);
    seed(user());

    await mount();

    await waitFor(() => expect(getPushToken).toHaveBeenCalled());
    expect(apiPut).not.toHaveBeenCalled();
    expect(setRegisteredPushToken).not.toHaveBeenCalled();
  });

  it("stays silent when the request fails, and remembers no token", async () => {
    apiPut.mockRejectedValue(new Error("offline"));
    seed(user());

    await mount();

    await waitFor(() => expect(apiPut).toHaveBeenCalled());
    expect(setRegisteredPushToken).not.toHaveBeenCalled();
  });

  it("stays silent when getting the token throws", async () => {
    getPushToken.mockRejectedValue(new Error("boom"));
    seed(user());

    await mount();

    await waitFor(() => expect(getPushToken).toHaveBeenCalled());
    expect(apiPut).not.toHaveBeenCalled();
  });

  it("sends again with the new locale when the language changes", async () => {
    seed(user());
    await mount();
    await waitFor(() => expect(apiPut).toHaveBeenCalledTimes(1));

    await i18n.changeLanguage("pt-BR");

    await waitFor(() => expect(apiPut).toHaveBeenCalledTimes(2));
    expect(apiPut).toHaveBeenLastCalledWith(
      "/notifications/push-token",
      { token: "ExponentPushToken[abc]", locale: "pt-BR" },
      { authenticated: true },
    );
  });

  it("sends again when another user signs in on the same phone", async () => {
    seed(user());
    await mount();
    await waitFor(() => expect(apiPut).toHaveBeenCalledTimes(1));

    seed(user({ id: "user-2" }));

    await waitFor(() => expect(apiPut).toHaveBeenCalledTimes(2));
  });

  it("sends again when the account moves from pending to approved", async () => {
    seed(user({ status: "pending" }));
    await mount();
    await waitFor(() => expect(apiPut).toHaveBeenCalledTimes(1));

    seed(user({ status: "approved" }));

    await waitFor(() => expect(apiPut).toHaveBeenCalledTimes(2));
  });

  it("drops a registration that was cancelled before the token arrived", async () => {
    let resolveToken!: (token: string) => void;
    getPushToken.mockReturnValue(
      new Promise<string | null>((resolve) => {
        resolveToken = resolve;
      }),
    );
    seed(user());
    const { unmount } = await mount();

    await unmount();
    resolveToken("ExponentPushToken[late]");
    await Promise.resolve();

    expect(apiPut).not.toHaveBeenCalled();
  });
});
