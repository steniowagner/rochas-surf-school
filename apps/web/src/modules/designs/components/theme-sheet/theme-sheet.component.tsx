import { AppIcon } from "../app-icon";
import { BottomModal } from "../bottom-modal";

import type { ThemeSheetProps } from "./theme-sheet.types";

export function ThemeSheet({ title, description, options }: ThemeSheetProps) {
  return (
    <BottomModal>
      <div className="mb-3.5 flex flex-col gap-1">
        <h3 className="ds-text-sheet-title text-ink">{title}</h3>
        <p className="ds-text-body text-ink-2">{description}</p>
      </div>
      {options.map((option) => (
        <div key={option.label} role="button" aria-pressed={option.selected} className="flex min-h-11 items-center gap-3 border-t border-line py-3">
          <AppIcon name={option.icon} size={20} className="text-lagoon" />
          <span className="ds-text-list-title flex-1 text-ink">{option.label}</span>
          <AppIcon name="Ionicons:checkmark" size={19} className={`text-lagoon ${option.selected ? "" : "opacity-0"}`} />
        </div>
      ))}
    </BottomModal>
  );
}
