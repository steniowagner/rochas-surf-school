import { LOCATION_ADDRESS_MAX, LOCATION_NAME_MAX, normalizeLocationName } from "@rochas-surf-school/classes";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";

import { AddressSuggestion, ClassLocation } from "../../classes.types";
import { useAddressPlace } from "../../hooks/use-address-place.hook";
import { SUGGESTIONS_MIN_LENGTH, useAddressSuggestions } from "../../hooks/use-address-suggestions.hook";
import { useArchiveLocation } from "../../hooks/use-archive-location.hook";
import { useCreateLocation } from "../../hooks/use-create-location.hook";
import { useEditLocation } from "../../hooks/use-edit-location.hook";
import {
  getLocationErrorKey,
  isDuplicateLocationError,
  isLocationGoneError,
} from "../../utils/class-error";
import { LOCATIONS_QUERY_KEY } from "../../utils/locations-cache";
import { toMapPoint } from "../../utils/map";
import { newSessionToken } from "../../utils/session-token";

import { LocationSheetFields, UseLocationSheetProps } from "./location-sheet.types";

const fieldsOf = (location: ClassLocation | null | undefined): LocationSheetFields => ({
  name: location?.name ?? "",
  address: location?.address ?? "",
  point: location ? toMapPoint(location) : null,
  notify: true,
});

export const useLocationSheet = ({
  visible,
  locations,
  location,
  onClose,
  onCreated,
  onRemoved,
}: UseLocationSheetProps) => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const queryClient = useQueryClient();
  const createLocation = useCreateLocation();
  const editLocation = useEditLocation();
  const archiveLocation = useArchiveLocation();
  const [fields, setFields] = useState(() => fieldsOf(location));
  // What the suggestions are asked for: what the admin typed, and nothing after a suggestion was picked.
  const [searchText, setSearchText] = useState("");
  const [sessionToken, setSessionToken] = useState(newSessionToken);
  // The backend found the name taken, which the loaded list didn't show.
  const [duplicatedByServer, setDuplicatedByServer] = useState(false);
  const [archiveVisible, setArchiveVisible] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);
  const suggestionsQuery = useAddressSuggestions(searchText, sessionToken);
  const addressPlace = useAddressPlace(sessionToken);

  // Whatever closes the sheet, it opens again with the location's values (or empty) and a new suggestion session.
  if (wasVisible !== visible) {
    setWasVisible(visible);
    setFields(fieldsOf(visible ? location : null));
    setSearchText("");
    setDuplicatedByServer(false);
    setArchiveVisible(false);

    if (visible) {
      setSessionToken(newSessionToken());
    }
  }

  const editing = Boolean(location);
  const key = normalizeLocationName(fields.name);
  const duplicate =
    duplicatedByServer ||
    (key !== "" &&
      locations.some(
        (item) => item.id !== location?.id && normalizeLocationName(item.name) === key,
      ));
  const canSubmit =
    fields.name.trim() !== "" && fields.address.trim() !== "" && fields.point !== null && !duplicate;
  const upcomingClasses = location?.upcomingClasses ?? 0;
  const searching = searchText.trim().length >= SUGGESTIONS_MIN_LENGTH;

  const changeName = (name: string) => {
    setFields((current) => ({ ...current, name }));
    setDuplicatedByServer(false);
  };

  const changeAddress = (address: string) => {
    setFields((current) => ({ ...current, address }));
    setSearchText(address);
  };

  const changeNotify = (notify: boolean) => setFields((current) => ({ ...current, notify }));

  const changePoint = (point: NonNullable<typeof fields.point>) =>
    setFields((current) => ({ ...current, point }));

  const pickSuggestion = async (suggestion: AddressSuggestion) => {
    setSearchText("");

    try {
      const place = await addressPlace.mutateAsync(suggestion.placeId);

      setFields((current) => ({
        ...current,
        address: place.address.slice(0, LOCATION_ADDRESS_MAX),
        point: { latitude: place.latitude, longitude: place.longitude },
        // The place's name only fills an empty Nome: what the admin typed stays.
        name: current.name.trim() === "" ? place.name.slice(0, LOCATION_NAME_MAX) : current.name,
      }));
    } catch {
      // No toast: the admin can still type the address and tap the map.
    }
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
      await queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY });
      onClose();
      // The row is gone for good: a selected one must leave the form too.
      onRemoved?.(location!.id);
    }
  };

  const submit = async () => {
    // The button is off while a field is empty, the point is missing or the name is repeated, and ignores presses
    // while sending.
    const body = {
      name: fields.name.trim(),
      address: fields.address.trim(),
      latitude: fields.point!.latitude,
      longitude: fields.point!.longitude,
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
        onCreated(await createLocation.mutateAsync(body));
      }

      onClose();
    } catch (error) {
      await handleSaveError(error);
    }
  };

  const confirmArchive = async () => {
    try {
      await archiveLocation.mutateAsync(location!.id);
      alertMessage.show(t("archiveLocation.removed", { name: location!.name }));
      setArchiveVisible(false);
      onClose();
      onRemoved?.(location!.id);
    } catch (error) {
      setArchiveVisible(false);
      await handleSaveError(error);
    }
  };

  return {
    editing,
    fields,
    nameMaxLength: LOCATION_NAME_MAX,
    addressMaxLength: LOCATION_ADDRESS_MAX,
    // The query lags the text by the debounce: rows of an older text never show for a text too short to search.
    suggestions: searching ? (suggestionsQuery.data?.items ?? []) : [],
    showNotify: editing && upcomingClasses > 0,
    upcomingClasses,
    duplicate,
    canSubmit,
    loading: createLocation.isPending || editLocation.isPending,
    archiving: archiveLocation.isPending,
    archiveVisible,
    changeName,
    changeAddress,
    changeNotify,
    changePoint,
    pickSuggestion,
    submit,
    openArchive: () => setArchiveVisible(true),
    closeArchive: () => setArchiveVisible(false),
    confirmArchive,
    close: onClose,
    // A native sheet that opens over another dismisses it: the edit sheet going away for the confirmation isn't the
    // admin closing it, and it comes back when the confirmation is.
    dismiss: () => {
      if (!archiveVisible) {
        onClose();
      }
    },
  };
};
