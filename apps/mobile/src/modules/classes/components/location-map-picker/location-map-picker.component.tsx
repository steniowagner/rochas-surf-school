import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

import { getMapProvider } from "../../utils/map";

import { useLocationMapPicker } from "./location-map-picker.hook";
import { LocationMapPickerProps } from "./location-map-picker.types";

const styles = StyleSheet.create({ map: { flex: 1 } });

/** "Ponto no mapa": a map where a tap marks the point of the location, with a hint under it. */
export function LocationMapPicker(props: LocationMapPickerProps) {
  const { t } = useTranslation();
  const { region, handlePress, handleRegionChange } = useLocationMapPicker(props);

  return (
    <View className="gap-1.5">
      <Text className="ds-text-section-label text-ink-2">
        {t("locationSheet.point")}
      </Text>
      <View className="h-[170px] overflow-hidden rounded-card border border-line">
        <MapView
          testID="location-map-picker"
          style={styles.map}
          provider={getMapProvider()}
          region={region}
          onRegionChangeComplete={handleRegionChange}
          onPress={handlePress}
          accessibilityLabel={t("locationSheet.point")}
        >
          {props.point ? <Marker testID="location-marker" coordinate={props.point} /> : null}
        </MapView>
      </View>
      <Text className="ds-text-list-subtitle px-1 text-ink-2">
        {props.point ? t("locationSheet.pointHintSet") : t("locationSheet.pointHintEmpty")}
      </Text>
    </View>
  );
}
