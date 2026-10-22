import { useTranslation } from "react-i18next";
import { Linking } from "react-native";

import { useAlertMessage } from "@/providers/alert-message";

import type { MapPoint } from "../../classes.types";
import { getDirectionsUrl } from "../../utils/map";

export const useClassLocationCard = () => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();

  const openDirections = async (point: MapPoint) => {
    try {
      await Linking.openURL(getDirectionsUrl(point));
    } catch {
      alertMessage.show(t("classDetails.directionsUnavailable"));
    }
  };

  return { openDirections };
};
