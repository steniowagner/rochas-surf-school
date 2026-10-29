import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";

import type { MyLocationButtonProps } from "./my-location-button.types";

/** The round "my location" button over the map, 44 pt, like a maps app's. */
export function MyLocationButton({ locale }: MyLocationButtonProps) {
  return (
    <button type="button" aria-label={appT(locale, "locationSheet.myLocation")} className="flex size-11 items-center justify-center rounded-full border border-line bg-surface shadow-icon-button">
      <AppIcon name="Ionicons:locate" size={22} className="text-lagoon" />
    </button>
  );
}
