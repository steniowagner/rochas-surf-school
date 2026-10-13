import type { SessionUser } from "@/navigation/resolve-flow.types";
import { ApiError, NetworkError, SessionExpiredError } from "@/services/api";
import * as api from "@/services/api/api.client";
import { getSession, hydrateSession } from "@/services/session/session.store";

import { refreshAccount } from "./refresh-account";

jest.mock("@/services/api/api.client");

const apiGet = jest.mocked(api.apiGet);

const account = (status: string) =>
  ({ id: "user-1", status, name: "Ana" }) as SessionUser;

describe("refreshAccount", () => {
  beforeEach(() => {
    apiGet.mockReset();
    hydrateSession({
      user: account("pending"),
      tokens: {
        accessToken: "access",
        accessTokenExpiresAt: "2099-10-10T12:15:00.000Z",
        refreshToken: "refresh",
        refreshTokenExpiresAt: "2099-11-10T12:00:00.000Z",
      },
    });
  });

  it("loads the account into the session, keeping the tokens", async () => {
    apiGet.mockResolvedValue(account("approved"));

    await expect(refreshAccount()).resolves.toEqual(account("approved"));

    expect(apiGet).toHaveBeenCalledWith("/auth/me", { authenticated: true });
    expect(getSession()?.user.status).toBe("approved");
    expect(getSession()?.tokens.refreshToken).toBe("refresh");
  });

  it.each([new NetworkError(), new ApiError(500, ["INTERNAL_SERVER_ERROR"])])(
    "returns null and leaves the session alone when the call fails (%s)",
    async (error) => {
      apiGet.mockRejectedValue(error);

      await expect(refreshAccount()).resolves.toBeNull();

      expect(getSession()?.user.status).toBe("pending");
    },
  );

  it("rethrows an expired session", async () => {
    apiGet.mockRejectedValue(new SessionExpiredError());

    await expect(refreshAccount()).rejects.toBeInstanceOf(SessionExpiredError);
  });
});
