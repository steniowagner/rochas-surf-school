import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { useTheme } from "@/hooks/use-theme";

import { LocationMapPreview } from "../location-map-preview";

import { useClassLocationCard } from "./class-location-card.hook";
import type { ClassLocationCardProps } from "./class-location-card.types";

/** The "Onde e como" card: the map across the top, then the place and "Direções" to open the phone's maps app. */
export function ClassLocationCard({
  name,
  address,
  point,
}: ClassLocationCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { openDirections } = useClassLocationCard();

  return (
    <View className="overflow-hidden rounded-card border border-line bg-surface">
      {point ? <LocationMapPreview point={point} /> : null}
      <View
        className={`min-h-11 flex-row items-center gap-2.5 px-3.5 py-3 ${point ? "border-t border-line" : ""}`}
      >
        <Feather name="map-pin" size={16} color={theme.lagoon} />
        <View className="flex-1">
          <Text numberOfLines={1} className="ds-text-list-title text-ink">
            {name}
          </Text>
          <Text className="ds-text-list-subtitle text-ink-2">{address}</Text>
        </View>
        {point ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("classDetails.directions")}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={() => openDirections(point)}
            className="min-h-11 flex-row items-center gap-1"
          >
            <Text className="ds-text-section-label text-lagoon">
              {t("classDetails.directions")}
            </Text>
            <Feather name="arrow-up-right" size={13} color={theme.lagoon} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
