import { AppIcon } from "@/modules/designs/components/app-icon";
import { ArchiveLocationSheet } from "@/modules/designs/components/archive-location-sheet";
import { Button } from "@/modules/designs/components/button";
import { Checkbox } from "@/modules/designs/components/checkbox";
import { LocationAddressCard } from "@/modules/designs/components/location-address-card";
import { LocationMap } from "@/modules/designs/components/location-map";
import { LocationSearchHeader } from "@/modules/designs/components/location-search-header";
import { MyLocationButton } from "@/modules/designs/components/my-location-button";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { TextInput } from "@/modules/designs/components/text-input";
import { classLocations } from "@/modules/designs/data/fortaleza";
import { appT } from "@/modules/designs/i18n/app-t";

import type { LocationFormScreenProps } from "./location-form-screen.types";

// The point of the place, "-3.7190, -38.5020" as the app's `formatPoint` writes it.
const POINT = "-3.7190, -38.5020";
const UPCOMING_CLASSES = 6;

/**
 * "Novo local" / "Editar local" on a full-screen map, like a maps app: the search in the header, the map (drawn with
 * tokens, D-07), "my location" and, at the bottom, the panel with the address, the name and the actions.
 */
export function LocationFormScreen({ locale, state }: LocationFormScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const editing = state === "edit" || state === "archive";
  const picked = state !== "new";
  const place = editing ? { address: classLocations.iracema.address, point: POINT } : picked ? { address: classLocations.futuro.address, point: POINT } : null;
  const name = editing ? classLocations.iracema.name : state === "duplicate" ? classLocations.iracema.name : picked ? "Barraca do Chico" : "";

  return (
    <PhoneFrame>
      <div className="relative flex flex-1 flex-col overflow-hidden bg-page">
        <LocationMap pin={picked} />
        <LocationSearchHeader locale={locale} />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3">
          <div className="flex justify-end px-5">
            <MyLocationButton locale={locale} />
          </div>
          <div data-testid="location-form-panel" className="flex flex-col gap-4 rounded-t-sheet bg-page px-5 pb-8 pt-5 shadow-menu-option">
            <h2 className="ds-text-sheet-title text-ink">{t(editing ? "locationSheet.editTitle" : "locationSheet.title")}</h2>
            <LocationAddressCard locale={locale} place={place} />
            <div className="flex flex-col gap-1.5">
              <p className="ds-text-section-label text-ink-2">{t("locationSheet.name")}</p>
              <TextInput
                icon={<AppIcon name="Ionicons:location-outline" size={20} className="text-ink-2" />}
                value={name}
                placeholder={t("locationSheet.namePlaceholder")}
                status={state === "duplicate" ? "error" : "neutral"}
                errorMessage={t("locationSheet.duplicate")}
              />
            </div>
            {editing ? (
              <div>
                <Checkbox checked label={t("locationSheet.notify")} />
                <p className="ds-text-list-subtitle px-1 text-ink-2">{t("locationSheet.notifyCount", { count: UPCOMING_CLASSES })}</p>
              </div>
            ) : null}
            <div data-testid="location-form-actions" className="flex flex-col gap-2">
              {/* An edit waits for a change, a new place for its point and a name that is free. */}
              <Button disabled={state !== "pointPicked"}>{t(editing ? "locationSheet.save" : "locationSheet.submit")}</Button>
              <Button variant="outline">{t("common.cancel")}</Button>
              {editing ? <Button variant="ghost">{t("locationSheet.remove")}</Button> : null}
            </div>
          </div>
        </div>
        {state === "archive" ? <ArchiveLocationSheet locale={locale} name={classLocations.iracema.name} address={classLocations.iracema.address} upcomingClasses={UPCOMING_CLASSES} /> : null}
      </div>
    </PhoneFrame>
  );
}
