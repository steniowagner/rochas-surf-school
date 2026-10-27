import { LOCATION_ADDRESS_MAX } from "@rochas-surf-school/classes";
import { LocationGeocodedAddress, reverseGeocodeAsync } from "expo-location";
import { useRef, useState } from "react";

import {
  MapPlace,
  MapPoint,
  MapPressEvent,
  PoiClickEvent,
} from "../classes.types";
import { formatPoint } from "../utils/map";

import { useAddressPlace } from "./use-address-place.hook";

/** The device's answer as one line: Android's own line, else the street and number, the district, the city and the state. */
const formatAddress = ({
  formattedAddress,
  street,
  streetNumber,
  district,
  city,
  subregion,
  region,
}: LocationGeocodedAddress): string =>
  formattedAddress ??
  [
    [street, streetNumber].filter(Boolean).join(", "),
    district,
    city ?? subregion,
    region,
  ]
    .filter(Boolean)
    .join(" – ");

/** The address of a point on the map from the device's geocoder; the coordinates when it fails or finds nothing. */
const reverseGeocode = async (point: MapPoint): Promise<string> => {
  try {
    const [found] = await reverseGeocodeAsync(point);
    const address = found ? formatAddress(found).trim() : "";

    return address === ""
      ? formatPoint(point)
      : address.slice(0, LOCATION_ADDRESS_MAX);
  } catch {
    return formatPoint(point);
  }
};

/**
 * What a tap picks on the location screen's map: a point (its address from the device, else its coordinates), a
 * labelled place of Google Maps (Android; its address and point from Google, else the point tapped) or a suggestion.
 * Each answer goes to `onSelect`; an answer that arrives after a newer tap is dropped.
 */
export const useMapPlace = ({
  sessionToken,
  onSelect,
}: {
  sessionToken: string;
  onSelect: (place: MapPlace) => void;
}) => {
  const addressPlace = useAddressPlace(sessionToken);
  // A lookup under way, with the point that was tapped (none for a suggestion): the pin moves there at once.
  const [pending, setPending] = useState<{ point: MapPoint | null } | null>(
    null,
  );
  // The latest tap: the one whose answer may still go to the screen.
  const latest = useRef(0);

  const resolve = async (
    find: () => Promise<MapPlace | null>,
    point: MapPoint | null,
  ) => {
    latest.current += 1;
    const current = latest.current;

    setPending({ point });
    const place = await find();

    if (current !== latest.current) {
      return;
    }

    setPending(null);

    if (place) {
      onSelect(place);
    }
  };

  const pointPlace = async (point: MapPoint): Promise<MapPlace> => ({
    point,
    address: await reverseGeocode(point),
    name: null,
  });

  const lookUpPlace = async (placeId: string): Promise<MapPlace> => {
    const place = await addressPlace.mutateAsync(placeId);

    return {
      point: { latitude: place.latitude, longitude: place.longitude },
      address: place.address.slice(0, LOCATION_ADDRESS_MAX),
      name: place.name,
    };
  };

  const pressMap = ({ nativeEvent }: MapPressEvent) => {
    const { latitude, longitude } = nativeEvent.coordinate;
    const point = { latitude, longitude };

    return resolve(() => pointPlace(point), point);
  };

  // A place Google doesn't answer for is still a point on the map.
  const pressPoi = ({ nativeEvent }: PoiClickEvent) => {
    const { latitude, longitude } = nativeEvent.coordinate;
    const point = { latitude, longitude };

    return resolve(
      () => lookUpPlace(nativeEvent.placeId).catch(() => pointPlace(point)),
      point,
    );
  };

  // No toast for a suggestion that can't be looked up: the admin can search again or tap the map.
  const pickPlace = (placeId: string) =>
    resolve(() => lookUpPlace(placeId).catch(() => null), null);

  return {
    resolving: pending !== null,
    pendingPoint: pending?.point ?? null,
    pressMap,
    pressPoi,
    pickPlace,
  };
};
