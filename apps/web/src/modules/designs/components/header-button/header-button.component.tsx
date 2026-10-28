import { AppIcon } from "../app-icon";

import type { HeaderButtonProps } from "./header-button.types";

export function HeaderButton({ icon, iconSize = 24, label, badge, standalone = false }: HeaderButtonProps) {
  const showBadge = badge !== undefined && badge > 0;

  return (
    <button
      type="button"
      aria-label={label}
      className={`relative flex items-center justify-center text-ink ${standalone ? "size-11 rounded-full bg-surface/60 shadow-icon-button" : ""}`}
    >
      <AppIcon name={icon} size={iconSize} />
      {showBadge ? (
        <span
          data-testid="header-button-badge"
          className={`ds-text-badge absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-bad px-1 text-center text-on-color ${standalone ? "right-2 top-1" : "-right-1.5 -top-1"}`}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
