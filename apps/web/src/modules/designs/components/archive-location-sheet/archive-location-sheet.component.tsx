import { appT } from "@/modules/designs/i18n/app-t";

import { BottomModal } from "../bottom-modal";
import { Button } from "../button";
import { LocationSummaryCard } from "../location-summary-card";

import type { ArchiveLocationSheetProps } from "./archive-location-sheet.types";

/** "Remover local?": the confirmation before a location is archived. */
export function ArchiveLocationSheet({ locale, name, address, upcomingClasses }: ArchiveLocationSheetProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);

  return (
    <BottomModal>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <h3 className="ds-text-sheet-title text-ink">{t("archiveLocation.title")}</h3>
          <LocationSummaryCard title={name} subtitle={address} />
          <div className="flex flex-col gap-1">
            <p className="ds-text-body text-ink-2">{t("archiveLocation.description")}</p>
            {upcomingClasses > 0 ? <p className="ds-text-body text-ink-2">{t("archiveLocation.kept", { count: upcomingClasses })}</p> : null}
          </div>
        </div>
        <Button variant="danger">{t("archiveLocation.confirm")}</Button>
        <Button variant="ghost">{t("archiveLocation.keep")}</Button>
      </div>
    </BottomModal>
  );
}
