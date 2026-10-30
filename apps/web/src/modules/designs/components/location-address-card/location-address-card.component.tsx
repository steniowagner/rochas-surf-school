import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { LocationSummaryCard } from "../location-summary-card";

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

  return <LocationSummaryCard title={resolving ? t("locationSheet.resolving") : place!.address} subtitle={point ? `${source} · ${point}` : undefined} />;
}
