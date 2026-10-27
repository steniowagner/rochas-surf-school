import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import { formatPoint } from "../../utils/map";

import { LocationAddressCardProps } from "./location-address-card.types";

/**
 * The address of the location screen: the hint before any point, else the address over where it came from (the
 * place's name, or "Ponto escolhido no mapa") and the coordinates; while an address is looked up, a line that says so.
 */
export function LocationAddressCard({
  place,
  resolving,
  pendingPoint,
}: LocationAddressCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const point = pendingPoint ?? place?.point;

  if (!resolving && !place) {
    return (
      <View
        testID="location-address-card"
        className="min-h-11 flex-row items-center gap-2.5 rounded-card border border-dashed border-line px-3.5 py-3"
      >
        <Feather name="map-pin" size={16} color={theme.ink3} />
        <Text className="ds-text-body flex-1 text-ink-2">
          {t("locationSheet.pointHintEmpty")}
        </Text>
      </View>
    );
  }

  const source = pendingPoint
    ? t("locationSheet.pointPicked")
    : (place?.name ?? t("locationSheet.pointPicked"));

  return (
    // `border-solid` resets the empty card's dashed border, which Android keeps when the class just goes away.
    <View
      testID="location-address-card"
      className="min-h-11 flex-row items-center gap-2.5 rounded-card border border-solid border-line bg-surface px-3.5 py-3"
    >
      <Feather name="map-pin" size={16} color={theme.lagoon} />
      <View className="flex-1">
        <Text numberOfLines={2} className="ds-text-list-title text-ink">
          {resolving ? t("locationSheet.resolving") : place!.address}
        </Text>
        {point ? (
          <Text numberOfLines={1} className="ds-text-list-subtitle text-ink-2">
            {`${source} · ${formatPoint(point)}`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
