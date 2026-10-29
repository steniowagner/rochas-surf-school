import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";

import type { LocationSearchHeaderProps } from "./location-search-header.types";

/** The location screen's transparent header over the map: the back button and the address search field, as its title. */
export function LocationSearchHeader({ locale, text = "" }: LocationSearchHeaderProps) {
  const t = (key: string) => appT(locale, key);

  return (
    <header className="absolute inset-x-0 top-0 z-10 flex h-11 items-center gap-2 px-5">
      <span className="flex size-11 shrink-0 items-center justify-center">
        <AppIcon name="Ionicons:chevron-back" size={24} className="text-ink" />
      </span>
      <div data-testid="location-search-field" className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-control border border-line bg-surface pl-3">
        <AppIcon name="Ionicons:search-outline" size={18} className="text-ink-2" />
        <span className={`ds-text-body flex-1 truncate ${text ? "text-ink" : "text-ink-2"}`}>{text || t("locationSheet.addressSearchPlaceholder")}</span>
        {text ? (
          <span role="button" aria-label={t("common.clear")} className="flex size-11 items-center justify-center">
            <AppIcon name="Ionicons:close-circle" size={18} className="text-ink-2" />
          </span>
        ) : null}
      </div>
    </header>
  );
}
