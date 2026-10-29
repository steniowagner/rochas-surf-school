import { AppIcon } from "../app-icon";
import { BottomModal } from "../bottom-modal";

import type { LanguageSheetProps } from "./language-sheet.types";

export function LanguageSheet({ title, description, locales }: LanguageSheetProps) {
  return (
    <BottomModal>
      <div className="mb-3.5 flex flex-col gap-1">
        <h3 className="ds-text-sheet-title text-ink">{title}</h3>
        <p className="ds-text-body text-ink-2">{description}</p>
      </div>
      {locales.map((locale) => (
        <div key={locale.name} role="button" aria-pressed={locale.selected} className="flex min-h-11 items-center gap-3 border-t border-line py-3">
          <span className="text-2xl">{locale.flag}</span>
          <span className="ds-text-list-title flex-1 text-ink">{locale.name}</span>
          {locale.selected ? <AppIcon name="Ionicons:checkmark" size={19} className="text-lagoon" /> : null}
        </div>
      ))}
    </BottomModal>
  );
}
