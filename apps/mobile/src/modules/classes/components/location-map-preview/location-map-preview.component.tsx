import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

import { getMapProvider, PREVIEW_DELTA, regionAround } from "../../utils/map";

import { useLocationMapPreview } from "./location-map-preview.hook";
import { LocationMapPreviewProps } from "./location-map-preview.types";

const styles = StyleSheet.create({ map: { flex: 1 } });

/** A small fixed map of the class's location with its marker, and "Direções" to open the phone's maps app. */
export function LocationMapPreview(props: LocationMapPreviewProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { openDirections } = useLocationMapPreview(props);

  return (
    <View className="gap-3">
      <View className="h-24 overflow-hidden rounded-control border border-line">
        <MapView
          testID="location-map-preview"
          style={styles.map}
          provider={getMapProvider()}
          initialRegion={regionAround(props.point, PREVIEW_DELTA)}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          <Marker coordinate={props.point} />
        </MapView>
      </View>
      <Button
        variant="outline"
        icon={<Ionicons name="navigate-outline" size={18} color={theme.ink} />}
        onPress={openDirections}
      >
        {t("classDetails.directions")}
      </Button>
    </View>
  );
}
