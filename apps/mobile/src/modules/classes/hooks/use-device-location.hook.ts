import {
  Accuracy,
  getCurrentPositionAsync,
  requestForegroundPermissionsAsync,
} from "expo-location";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";

import { MapPoint } from "../classes.types";

/**
 * "My location" on the location screen: the foreground permission is asked only when the admin taps the button (the
 * system asks once; later a denial answers at once), then the device's position. A denial or a failed read shows a
 * toast and gives nothing; once granted, the map may show the user dot.
 */
export const useDeviceLocation = () => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const [granted, setGranted] = useState(false);

  const locate = async (): Promise<MapPoint | null> => {
    try {
      const permission = await requestForegroundPermissionsAsync();

      if (!permission.granted) {
        alertMessage.show(t("locationSheet.locationDenied"));
        return null;
      }

      setGranted(true);
      const { coords } = await getCurrentPositionAsync({
        accuracy: Accuracy.Balanced,
      });

      return { latitude: coords.latitude, longitude: coords.longitude };
    } catch {
      alertMessage.show(t("locationSheet.locationDenied"));
      return null;
    }
  };

  return { granted, locate };
};
