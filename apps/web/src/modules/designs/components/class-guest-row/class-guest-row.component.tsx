import { appT } from "@/modules/designs/i18n/app-t";

import { Chip } from "../chip";
import { GuestAvatar } from "../guest-avatar";

import type { ClassGuestRowProps } from "./class-guest-row.types";

/** A trial guest in the class's list: not pressable, since a guest has no account and no person sheet. */
export function ClassGuestRow({ locale, name, takeOut = false }: ClassGuestRowProps) {
  const trial = appT(locale, "classDetails.trialChip");

  return (
    <div className="flex min-h-11 items-center gap-3 border-t border-line px-3.5 py-2.5">
      <GuestAvatar locale={locale} size={32} />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {name ? <p className="ds-text-list-title shrink truncate text-ink">{name}</p> : null}
        <Chip tone="muted">{trial}</Chip>
      </div>
      {takeOut ? (
        <button type="button" aria-label={`${appT(locale, "takeOutSheet.action")} ${name ?? trial}`} className="flex min-h-11 items-center justify-center rounded-full border border-line px-4">
          <span className="ds-text-chip text-bad">{appT(locale, "takeOutSheet.action")}</span>
        </button>
      ) : null}
    </div>
  );
}
