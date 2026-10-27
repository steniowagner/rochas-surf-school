import {
  LOCATION_NAME_MAX,
  normalizeLocationName,
} from "@rochas-surf-school/classes";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { RefObject, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, LayoutChangeEvent } from "react-native";
import MapView from "react-native-maps";

import { useAlertMessage } from "@/providers/alert-message";

import { AddressSuggestion, ClassLocation, MapPlace } from "../classes.types";
import { useArchiveLocation } from "../hooks/use-archive-location.hook";
import { useCreateLocation } from "../hooks/use-create-location.hook";
import { useDeviceLocation } from "../hooks/use-device-location.hook";
import { useEditLocation } from "../hooks/use-edit-location.hook";
import { useKeyboardLift } from "../hooks/use-keyboard-lift.hook";
import { useLocations } from "../hooks/use-locations.hook";
import { useMapPlace } from "../hooks/use-map-place.hook";
import {
  getLocationErrorKey,
  isDuplicateLocationError,
  isLocationGoneError,
} from "../utils/class-error";
import {
  emitLocationCreated,
  emitLocationRemoved,
} from "../utils/location-events";
import { LOCATIONS_QUERY_KEY } from "../utils/locations-cache";
import {
  PLACE_ALTITUDE,
  PLACE_DELTA,
  PLACE_ZOOM,
  regionAround,
  toMapPoint,
} from "../utils/map";
import { newSessionToken } from "../utils/session-token";

import { LocationFormFields } from "./location-form.screen.types";

const fieldsOf = (location: ClassLocation | null): LocationFormFields => {
  const point = location ? toMapPoint(location) : null;

  return {
    name: location?.name ?? "",
    // A location saved without a point (before spec 037) needs one picked again.
    place:
      location && point
        ? { point, address: location.address, name: location.name }
        : null,
    notify: true,
  };
};

/**
 * "Novo local" (no `id`) and "Editar local" (`?id=`): the form rules of the old location sheet on a full-screen map.
 * The class form learns about a created or removed location through the location events.
 */
export const useLocationFormScreen = (
  // The map isn't controlled (feeding its region back drifts it under the padding): it is moved through this ref.
  mapRef: RefObject<MapView | null>,
) => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const queryClient = useQueryClient();
  const headerHeight = useHeaderHeight();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const locationsQuery = useLocations();
  const createLocation = useCreateLocation();
  const editLocation = useEditLocation();
  const archiveLocation = useArchiveLocation();
  const deviceLocation = useDeviceLocation();
  // The panel stays flush with the bottom of the screen and rides on top of the keyboard.
  const panelStyle = useKeyboardLift();
  // One suggestion session per opening of the screen (Google bills autocomplete by session).
  const [sessionToken] = useState(newSessionToken);
  const [fields, setFields] = useState(() => fieldsOf(null));
  // The location whose values filled the form: the list may come after the screen opened.
  const [filledId, setFilledId] = useState<string | null>(null);
  // The backend found the name taken, which the loaded list didn't show.
  const [duplicatedByServer, setDuplicatedByServer] = useState(false);
  const [archiveVisible, setArchiveVisible] = useState(false);
  const [panelHeight, setPanelHeight] = useState(0);
  // Google Maps (Android) crashes when it gets a padding before the map is ready: only the map that reported ready
  // (the map is mounted again once an edited location fills the form) gets one.
  const [readyMapKey, setReadyMapKey] = useState<string | null>(null);
  // The screen is going back: a location that leaves the list now isn't "gone" news.
  const leaving = useRef(false);

  const editing = Boolean(id);
  const locations = locationsQuery.data?.items ?? [];
  const location = id
    ? (locations.find((item) => item.id === id) ?? null)
    : null;

  if (location && filledId !== location.id) {
    setFilledId(location.id);
    setFields(fieldsOf(location));
  }

  const mapKey = filledId ?? "new";
  // "Editar local" opens close on its location; "Novo local" (or a location saved without a point) on Fortaleza.
  const editedPoint = location ? toMapPoint(location) : null;

  // An id that isn't among the active locations (removed meanwhile, or the list failed): nothing to edit.
  const missing = editing && !locationsQuery.isPending && !location;

  useEffect(() => {
    if (missing && !leaving.current) {
      leaving.current = true;
      alertMessage.show(t("locationSheet.errors.gone"));
      router.back();
    }
  }, [missing, alertMessage, t]);

  const selectPlace = (place: MapPlace) => {
    setFields((current) => ({
      ...current,
      place,
      // The place's name only fills an empty Nome: what the admin typed stays.
      name:
        current.name.trim() === "" && place.name !== null
          ? place.name.slice(0, LOCATION_NAME_MAX)
          : current.name,
    }));

    // A place picked from the search (or a labelled place) closes the keyboard, centres the map and zooms in on it;
    // a tap doesn't move the map, the finger is there. No animation: the map resizes as the Android keyboard goes away,
    // which would stop it half-way.
    if (place.name !== null) {
      Keyboard.dismiss();
      mapRef.current?.setCamera({
        center: place.point,
        zoom: PLACE_ZOOM,
        altitude: PLACE_ALTITUDE,
      });
    }
  };

  const mapPlace = useMapPlace({ sessionToken, onSelect: selectPlace });

  const key = normalizeLocationName(fields.name);
  const duplicate =
    duplicatedByServer ||
    (key !== "" &&
      locations.some(
        (item) => item.id !== id && normalizeLocationName(item.name) === key,
      ));
  const canSubmit =
    fields.name.trim() !== "" &&
    fields.place !== null &&
    !mapPlace.resolving &&
    !duplicate;
  const upcomingClasses = location?.upcomingClasses ?? 0;

  const leave = () => {
    leaving.current = true;
    router.back();
  };

  const handleSaveError = async (error: unknown) => {
    if (isDuplicateLocationError(error)) {
      setDuplicatedByServer(true);
      await queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY });
      return;
    }

    const messageKey = getLocationErrorKey(error);

    if (messageKey !== null) {
      alertMessage.show(t(messageKey));
    }

    if (isLocationGoneError(error)) {
      leave();
      await queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY });
      // The row is gone for good: a selected one must leave the class form too.
      emitLocationRemoved(id!);
    }
  };

  const submit = async () => {
    // The button is off while the name or the point is missing, an address is looked up or the name is repeated,
    // and ignores presses while sending.
    const place = fields.place!;
    const body = {
      name: fields.name.trim(),
      address: place.address.trim(),
      latitude: place.point.latitude,
      longitude: place.point.longitude,
    };

    try {
      if (location) {
        await editLocation.mutateAsync({
          id: location.id,
          ...body,
          ...(upcomingClasses > 0 ? { notify: fields.notify } : {}),
        });
        alertMessage.show(t("locationSheet.updated"));
      } else {
        emitLocationCreated(await createLocation.mutateAsync(body));
      }

      leave();
    } catch (error) {
      await handleSaveError(error);
    }
  };

  const confirmArchive = async () => {
    const removed = location!;

    // The list drops the location as soon as it's archived, before the screen goes back.
    leaving.current = true;

    try {
      await archiveLocation.mutateAsync(removed.id);
      alertMessage.show(t("archiveLocation.removed", { name: removed.name }));
      setArchiveVisible(false);
      router.back();
      emitLocationRemoved(removed.id);
    } catch (error) {
      leaving.current = false;
      setArchiveVisible(false);
      await handleSaveError(error);
    }
  };

  const centreOnDevice = async () => {
    const point = await deviceLocation.locate();

    if (point) {
      mapRef.current?.animateToRegion(regionAround(point));
    }
  };

  return {
    editing,
    location,
    fields,
    nameMaxLength: LOCATION_NAME_MAX,
    duplicate,
    canSubmit,
    loading: createLocation.isPending || editLocation.isPending,
    showNotify: editing && upcomingClasses > 0,
    upcomingClasses,
    sessionToken,
    // The map opens on the location being edited, else on Fortaleza; it is mounted again when the location arrives.
    mapKey,
    initialRegion: editedPoint
      ? regionAround(editedPoint, PLACE_DELTA)
      : regionAround(null),
    pin: mapPlace.pendingPoint ?? fields.place?.point ?? null,
    resolving: mapPlace.resolving,
    pendingPoint: mapPlace.pendingPoint,
    showsUserLocation: deviceLocation.granted,
    panelStyle,
    mapPadding:
      readyMapKey === mapKey
        ? { top: headerHeight, right: 0, bottom: panelHeight, left: 0 }
        : undefined,
    readyMap: () => setReadyMapKey(mapKey),
    archiveVisible,
    archiving: archiveLocation.isPending,
    changeName: (name: string) => {
      setFields((current) => ({ ...current, name }));
      setDuplicatedByServer(false);
    },
    changeNotify: (notify: boolean) =>
      setFields((current) => ({ ...current, notify })),
    pressMap: mapPlace.pressMap,
    pressPoi: mapPlace.pressPoi,
    pickSuggestion: (suggestion: AddressSuggestion) =>
      mapPlace.pickPlace(suggestion.placeId),
    centreOnDevice,
    measurePanel: (event: LayoutChangeEvent) =>
      setPanelHeight(event.nativeEvent.layout.height),
    submit,
    cancel: leave,
    openArchive: () => setArchiveVisible(true),
    closeArchive: () => setArchiveVisible(false),
    confirmArchive,
  };
};
