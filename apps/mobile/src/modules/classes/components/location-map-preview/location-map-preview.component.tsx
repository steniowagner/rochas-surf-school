import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

import { getMapProvider, PREVIEW_DELTA, regionAround } from "../../utils/map";

import { LocationMapPreviewProps } from "./location-map-preview.types";

const styles = StyleSheet.create({ map: { flex: 1 } });

/** A small fixed map of the class's location with its marker, full-bleed at the top of its card. */
export function LocationMapPreview({ point }: LocationMapPreviewProps) {
  return (
    <View className="h-24">
      <MapView
        testID="location-map-preview"
        style={styles.map}
        provider={getMapProvider()}
        initialRegion={regionAround(point, PREVIEW_DELTA)}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <Marker coordinate={point} />
      </MapView>
    </View>
  );
}
