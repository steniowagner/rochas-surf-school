/* eslint-disable @typescript-eslint/no-require-imports -- isolateModules can only load a module again with require */

import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

import {
  clearRegisteredPushToken,
  getPushToken,
  getRegisteredPushToken,
  setRegisteredPushToken,
} from "./push.service";

const getPermissions = jest.mocked(Notifications.getPermissionsAsync);
const requestPermissions = jest.mocked(Notifications.requestPermissionsAsync);
const getExpoPushToken = jest.mocked(Notifications.getExpoPushTokenAsync);

const device = jest.requireMock<{ isDevice: boolean }>("expo-device");
const constants = Constants as unknown as {
  expoConfig: { extra?: { eas?: { projectId?: string } } };
  easConfig: { projectId?: string } | null;
};

const granted = { status: "granted" } as never;

describe("push.service", () => {
  beforeEach(() => {
    device.isDevice = true;
    constants.expoConfig = { extra: { eas: { projectId: "project-id" } } };
    constants.easConfig = null;
    getPermissions.mockReset().mockResolvedValue(granted);
    requestPermissions.mockReset().mockResolvedValue(granted);
    getExpoPushToken
      .mockReset()
      .mockResolvedValue({ data: "ExponentPushToken[test]" } as never);
    clearRegisteredPushToken();
  });

  describe("getPushToken", () => {
    it("returns the Expo push token of the project when permission is granted", async () => {
      await expect(getPushToken()).resolves.toBe("ExponentPushToken[test]");

      expect(getExpoPushToken).toHaveBeenCalledWith({ projectId: "project-id" });
      expect(requestPermissions).not.toHaveBeenCalled();
    });

    it("takes the project id from the EAS config when the app config has none", async () => {
      constants.expoConfig = {};
      constants.easConfig = { projectId: "eas-project" };

      await getPushToken();

      expect(getExpoPushToken).toHaveBeenCalledWith({ projectId: "eas-project" });
    });

    it("asks the OS permission when it is undetermined, then returns the token on grant", async () => {
      getPermissions.mockResolvedValue({ status: "undetermined" } as never);

      await expect(getPushToken()).resolves.toBe("ExponentPushToken[test]");

      expect(requestPermissions).toHaveBeenCalledTimes(1);
    });

    it("returns null when the OS dialog is refused", async () => {
      getPermissions.mockResolvedValue({ status: "undetermined" } as never);
      requestPermissions.mockResolvedValue({ status: "denied" } as never);

      await expect(getPushToken()).resolves.toBeNull();
      expect(getExpoPushToken).not.toHaveBeenCalled();
    });

    it("returns null, without asking again, when the permission was denied before", async () => {
      getPermissions.mockResolvedValue({ status: "denied" } as never);

      await expect(getPushToken()).resolves.toBeNull();
      expect(requestPermissions).not.toHaveBeenCalled();
    });

    it("returns null, without a dialog, when it is not a physical device", async () => {
      device.isDevice = false;
      getPermissions.mockResolvedValue({ status: "undetermined" } as never);

      await expect(getPushToken()).resolves.toBeNull();
      expect(requestPermissions).not.toHaveBeenCalled();
    });

    it("returns null, without a dialog, when there is no EAS project id", async () => {
      constants.expoConfig = {};

      await expect(getPushToken()).resolves.toBeNull();
      expect(getPermissions).not.toHaveBeenCalled();
    });

    it("returns null when getting the token throws", async () => {
      getExpoPushToken.mockRejectedValue(new Error("no network"));

      await expect(getPushToken()).resolves.toBeNull();
    });
  });

  describe("registered token", () => {
    it("remembers, returns and clears the token", () => {
      expect(getRegisteredPushToken()).toBeNull();

      setRegisteredPushToken("ExponentPushToken[a]");
      expect(getRegisteredPushToken()).toBe("ExponentPushToken[a]");

      clearRegisteredPushToken();
      expect(getRegisteredPushToken()).toBeNull();
    });
  });

  describe("at load", () => {
    const load = (os: "ios" | "android" = "ios") => {
      let loaded!: typeof Notifications;
      jest.isolateModules(() => {
        loaded = require("expo-notifications");
        // The isolated registry has its own copy of react-native.
        require("react-native").Platform.OS = os;
        require("./push.service");
      });
      return loaded;
    };

    it("shows foreground notifications as a banner", async () => {
      const loaded = load();
      const [{ handleNotification }] = jest.mocked(loaded.setNotificationHandler).mock
        .calls[0] as [{ handleNotification: () => Promise<unknown> }];

      await expect(handleNotification()).resolves.toEqual({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      });
    });

    it("creates the default channel on Android only", () => {
      expect(load().setNotificationChannelAsync).not.toHaveBeenCalled();

      const loaded = load("android");

      expect(loaded.setNotificationChannelAsync).toHaveBeenCalledWith("default", {
        name: "default",
        importance: 4,
      });
    });
  });
});
