import { apiDelete } from "@/services/api";
import {
  clearRegisteredPushToken,
  getPushToken,
} from "@/services/push/push.service";

/**
 * Removes this phone's push token from the backend when the OS permission is already granted (it never asks),
 * and forgets it locally. Any failure is ignored: the next launch or sign-in sends it again while pushes are off
 * (spec 026, D-10).
 */
export const unregisterPushToken = async (): Promise<void> => {
  try {
    const token = await getPushToken({ askPermission: false });

    if (token) {
      await apiDelete(
        "/notifications/push-token",
        { token },
        { authenticated: true },
      );
    }
  } catch {
    // Nothing to show: it is retried later.
  }

  clearRegisteredPushToken();
};
