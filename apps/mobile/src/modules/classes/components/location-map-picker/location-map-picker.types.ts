import { Region } from "react-native-maps";

import { MapPoint } from "../../classes.types";

export type LocationMapPickerProps = {
  /** The point of the location, or `null` while it has none. */
  point: MapPoint | null;
  /** A tap on the map: the point to mark. */
  onChange: (point: MapPoint) => void;
};

export type UseLocationMapPickerProps = LocationMapPickerProps;

export type MapPressEvent = {
  nativeEvent: { coordinate: MapPoint };
};

export type MapRegion = Region;
