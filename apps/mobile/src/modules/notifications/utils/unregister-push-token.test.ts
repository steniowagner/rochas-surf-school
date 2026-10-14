import * as api from "@/services/api/api.client";
import * as push from "@/services/push/push.service";

import { unregisterPushToken } from "./unregister-push-token";

jest.mock("@/services/api/api.client");
jest.mock("@/services/push/push.service");

const apiDelete = jest.mocked(api.apiDelete);
const getPushToken = jest.mocked(push.getPushToken);
const clearRegisteredPushToken = jest.mocked(push.clearRegisteredPushToken);

describe("unregisterPushToken", () => {
  beforeEach(() => {
    apiDelete.mockReset().mockResolvedValue(undefined);
    getPushToken.mockReset().mockResolvedValue("ExponentPushToken[abc]");
    clearRegisteredPushToken.mockReset();
  });

  it("deletes this phone's token without asking the permission, then forgets it", async () => {
    await unregisterPushToken();

    expect(getPushToken).toHaveBeenCalledWith({ askPermission: false });
    expect(apiDelete).toHaveBeenCalledWith(
      "/notifications/push-token",
      { token: "ExponentPushToken[abc]" },
      { authenticated: true },
    );
    expect(clearRegisteredPushToken).toHaveBeenCalledTimes(1);
  });

  it("sends nothing without a token (a simulator) but still forgets", async () => {
    getPushToken.mockResolvedValue(null);

    await unregisterPushToken();

    expect(apiDelete).not.toHaveBeenCalled();
    expect(clearRegisteredPushToken).toHaveBeenCalledTimes(1);
  });

  it("ignores a failed DELETE", async () => {
    apiDelete.mockRejectedValue(new Error("offline"));

    await expect(unregisterPushToken()).resolves.toBeUndefined();

    expect(clearRegisteredPushToken).toHaveBeenCalledTimes(1);
  });
});
