import { useState } from "react";

import { MapPoint } from "../../classes.types";
import { regionAround } from "../../utils/map";

import {
  MapPressEvent,
  MapRegion,
  UseLocationMapPickerProps,
} from "./location-map-picker.types";

const samePoint = (a: MapPoint | null, b: MapPoint | null): boolean =>
  a?.latitude === b?.latitude && a?.longitude === b?.longitude;

export const useLocationMapPicker = ({
  point,
  onChange,
}: UseLocationMapPickerProps) => {
  const [region, setRegion] = useState<MapRegion>(() => regionAround(point));
  // The point the map was last centred for: a point that moved from outside (a picked suggestion) recentres it, a
  // tap on the map doesn't (the finger is already there).
  const [anchor, setAnchor] = useState(point);

  if (!samePoint(anchor, point)) {
    setAnchor(point);
    setRegion(regionAround(point));
  }

  const handlePress = ({ nativeEvent }: MapPressEvent) => {
    const { latitude, longitude } = nativeEvent.coordinate;
    const tapped = { latitude, longitude };

    setAnchor(tapped);
    onChange(tapped);
  };

  return { region, handlePress, handleRegionChange: setRegion };
};
