import { useTranslation } from "react-i18next";
import { Linking } from "react-native";

import { useAlertMessage } from "@/providers/alert-message";

import { getDirectionsUrl } from "../../utils/map";

import { UseLocationMapPreviewProps } from "./location-map-preview.types";

export const useLocationMapPreview = ({ point }: UseLocationMapPreviewProps) => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();

  const openDirections = async () => {
    try {
      await Linking.openURL(getDirectionsUrl(point));
    } catch {
      alertMessage.show(t("classDetails.directionsUnavailable"));
    }
  };

  return { openDirections };
};
