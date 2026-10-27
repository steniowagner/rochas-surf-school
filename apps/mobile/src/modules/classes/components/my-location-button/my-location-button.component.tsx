import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { TouchableOpacity } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { MyLocationButtonProps } from "./my-location-button.types";

/** The round "my location" button over the map, 44 pt, like a maps app's. */
export function MyLocationButton({ onPress }: MyLocationButtonProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t("locationSheet.myLocation")}
      activeOpacity={BUTTON_ACTIVE_OPACITY}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-full border border-line bg-surface"
      style={shadowStyle("iconButton", theme)}
    >
      <Ionicons name="locate" size={22} color={theme.lagoon} />
    </TouchableOpacity>
  );
}
