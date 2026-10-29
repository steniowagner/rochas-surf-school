import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";

import type { LocationPickerProps } from "./location-picker.types";

/** The saved locations as rows (name and address), one chosen, and "Novo local"; while managing, a row opens its edit sheet. */
export function LocationPicker({ locale, locations, selectedId, managing }: LocationPickerProps) {
  const t = (key: string) => appT(locale, key);

  return (
    <div role="radiogroup" className="flex flex-col gap-2">
      {locations.map((location) => {
        const selected = location.id === selectedId;

        return (
          <div
            key={location.id}
            role="radio"
            aria-checked={selected}
            aria-label={location.name}
            aria-disabled={managing && location.archived ? true : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-card border px-4 py-3 ${selected ? "border-grape bg-grape-tint" : "border-line bg-surface"}`}
          >
            <AppIcon name="Ionicons:location-outline" size={20} className={selected ? "text-grape" : "text-ink-3"} />
            <div className="flex flex-1 flex-col">
              <p className="ds-text-list-title text-ink">{location.name}</p>
              <p className="ds-text-list-subtitle text-ink-2">{location.address}</p>
            </div>
            {location.archived ? <span className="ds-text-chip rounded-full bg-dim px-2.5 py-1 text-ink-2">{t("locationPicker.archived")}</span> : null}
            {managing && !location.archived ? <AppIcon name="Ionicons:create-outline" size={22} className="text-ink-2" /> : null}
            {!managing && selected ? <AppIcon name="Ionicons:checkmark" size={22} className="text-grape" /> : null}
          </div>
        );
      })}
      {managing ? null : (
        <button type="button" aria-label={t("newClass.location.add")} className="flex min-h-11 items-center justify-center gap-1.5 self-start rounded-full border border-dashed border-input-line px-4">
          <AppIcon name="Ionicons:add" size={16} className="text-grape" />
          <span className="ds-text-chip text-grape">{t("newClass.location.add")}</span>
        </button>
      )}
    </div>
  );
}
