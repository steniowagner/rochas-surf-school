import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const ANDROID_CHANNEL_ID = "default";

// A push that arrives with the app open is shown as a banner too, with no badge.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

if (Platform.OS === "android") {
  void Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: ANDROID_CHANNEL_ID,
    importance: Notifications.AndroidImportance.HIGH,
  });
}

let registeredPushToken: string | null = null;

export const getRegisteredPushToken = () => registeredPushToken;

export const setRegisteredPushToken = (token: string) => {
  registeredPushToken = token;
};

export const clearRegisteredPushToken = () => {
  registeredPushToken = null;
};

/**
 * The Expo push token of this phone, or null when it can't have one: not a physical device, no EAS project,
 * permission refused, or the call failed. The OS dialog is shown only while the permission is undetermined.
 */
export const getPushToken = async (): Promise<string | null> => {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!Device.isDevice || !projectId) {
    return null;
  }

  try {
    let { status } = await Notifications.getPermissionsAsync();

    if (status === "undetermined") {
      ({ status } = await Notifications.requestPermissionsAsync());
    }

    if (status !== "granted") {
      return null;
    }

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });

    return data;
  } catch {
    return null;
  }
};
