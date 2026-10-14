import { LOCATION_ADDRESS_MAX, LOCATION_NAME_MAX, normalizeLocationName } from "@rochas-surf-school/classes";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";

import { useCreateLocation } from "../../hooks/use-create-location.hook";
import { getClassErrorKey, isDuplicateLocationError } from "../../utils/class-error";
import { LOCATIONS_QUERY_KEY } from "../../utils/locations-cache";

import { UseLocationSheetProps } from "./location-sheet.types";

export const useLocationSheet = ({
  visible,
  locations,
  onClose,
  onCreated,
}: UseLocationSheetProps) => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const queryClient = useQueryClient();
  const createLocation = useCreateLocation();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  // The backend found the name taken, which the loaded list didn't show.
  const [duplicatedByServer, setDuplicatedByServer] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);

  const reset = () => {
    setName("");
    setAddress("");
    setDuplicatedByServer(false);
  };

  // The text never outlives the sheet: whatever closes it, it opens empty.
  if (wasVisible !== visible) {
    setWasVisible(visible);
    if (!visible) {
      reset();
    }
  }

  const key = normalizeLocationName(name);
  const duplicate =
    duplicatedByServer ||
    (key !== "" &&
      locations.some((item) => normalizeLocationName(item.name) === key));
  const canSubmit = name.trim() !== "" && address.trim() !== "" && !duplicate;

  const changeName = (text: string) => {
    setName(text);
    setDuplicatedByServer(false);
  };

  const submit = async () => {
    // The button is off while the name is repeated or a field is empty, and ignores presses while sending.
    try {
      const location = await createLocation.mutateAsync({
        name: name.trim(),
        address: address.trim(),
      });

      onCreated(location);
      onClose();
    } catch (error) {
      if (isDuplicateLocationError(error)) {
        setDuplicatedByServer(true);
        await queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY });
        return;
      }

      const messageKey = getClassErrorKey(error);

      if (messageKey !== null) {
        alertMessage.show(t(messageKey));
      }
    }
  };

  return {
    name,
    address,
    nameMaxLength: LOCATION_NAME_MAX,
    addressMaxLength: LOCATION_ADDRESS_MAX,
    duplicate,
    canSubmit,
    loading: createLocation.isPending,
    changeName,
    changeAddress: setAddress,
    submit,
    close: onClose,
  };
};
