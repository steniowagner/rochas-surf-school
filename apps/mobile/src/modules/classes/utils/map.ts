import { Platform } from "react-native";
import { PROVIDER_GOOGLE, Region } from "react-native-maps";

import { MapPoint } from "../classes.types";

/** Where the map opens when a location has no point yet: the centre of Fortaleza. */
export const FORTALEZA: MapPoint = { latitude: -3.7319, longitude: -38.5267 };

/** The span, in degrees, of the map around a point. */
export const MAP_DELTA = 0.2;

/** The tighter span of the preview on the class details, about a kilometre. */
export const PREVIEW_DELTA = 0.01;

/** The map around a point, or around Fortaleza when there is none. */
export const regionAround = (
  point: MapPoint | null,
  delta = MAP_DELTA,
): Region => ({
  ...(point ?? FORTALEZA),
  latitudeDelta: delta,
  longitudeDelta: delta,
});

/** The link that opens the phone's maps app with directions to the point: Apple Maps on iOS, Google Maps on Android. */
export const getDirectionsUrl = ({ latitude, longitude }: MapPoint): string =>
  Platform.OS === "ios"
    ? `https://maps.apple.com/?daddr=${latitude},${longitude}`
    : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

/** Google Maps on Android, Apple Maps (the default) on iOS. */
export const getMapProvider = () =>
  Platform.OS === "android" ? PROVIDER_GOOGLE : undefined;

/** The point of a location, or `null` when it was saved without one. */
export const toMapPoint = (location: {
  latitude: number | null;
  longitude: number | null;
}): MapPoint | null =>
  location.latitude === null || location.longitude === null
    ? null
    : { latitude: location.latitude, longitude: location.longitude };
