import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";

import type { LocationAddressCardProps } from "./location-address-card.types";

/**
 * The address of the location screen: the hint before any point, else the address over where it came from (the
 * place's name, or "Ponto escolhido no mapa") and the coordinates; while an address is looked up, a line that says so.
 */
export function LocationAddressCard({ locale, place, resolving = false, pendingPoint }: LocationAddressCardProps) {
  const t = (key: string) => appT(locale, key);
  const point = pendingPoint ?? place?.point;

  if (!resolving && !place) {
    return (
      <div data-testid="location-address-card" className="flex min-h-11 items-center gap-2.5 rounded-card border border-dashed border-line px-3.5 py-3">
        <AppIcon name="Feather:map-pin" size={16} className="text-ink-3" />
        <p className="ds-text-body flex-1 text-ink-2">{t("locationSheet.pointHintEmpty")}</p>
      </div>
    );
  }

  const source = pendingPoint ? t("locationSheet.pointPicked") : (place?.name ?? t("locationSheet.pointPicked"));

  return (
    <div data-testid="location-address-card" className="flex min-h-11 items-center gap-2.5 rounded-card border border-solid border-line bg-surface px-3.5 py-3">
      <AppIcon name="Feather:map-pin" size={16} className="text-lagoon" />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="ds-text-list-title line-clamp-2 text-ink">{resolving ? t("locationSheet.resolving") : place?.address}</p>
        {point ? <p className="ds-text-list-subtitle truncate text-ink-2">{`${source} · ${point}`}</p> : null}
      </div>
    </div>
  );
}
