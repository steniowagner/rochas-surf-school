import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { Button } from "../button";
import { Chip } from "../chip";
import { PersonAvatar } from "../person-avatar";
import { roleChips } from "../person-row/person-row.component";
import { RemovalInfoRow } from "../removal-info-row";

import type { RemovedAccountRowProps } from "./removed-account-row.types";

/** One removed account as a card: the avatar with the name and role chip, then when it was removed and the day it is deleted for good, with Restore beside them. */
export function RemovedAccountRow({ locale, name, role, removedOn, deletedOn }: RemovedAccountRowProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);

  return (
    <div data-testid="removed-account-row" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
      <div role="button" aria-label={name} className="flex items-center gap-3">
        <PersonAvatar name={name} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <p className="ds-text-list-title truncate text-ink">{name}</p>
          <Chip tone={roleChips[role]}>{t(`profile.role.${role}`)}</Chip>
        </div>
        <AppIcon name="Ionicons:chevron-forward" size={18} className="text-ink-3" />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <RemovalInfoRow icon="Ionicons:close-circle-outline" text={t("people.removed.removedOn", { date: removedOn })} />
          <RemovalInfoRow icon="Ionicons:trash-outline" text={t("people.removed.deletedOn", { until: deletedOn })} tone="danger" />
        </div>
        <Button variant="outline" className="px-3.5!">
          {t("people.removed.restore")}
        </Button>
      </div>
    </div>
  );
}
