import { AppIcon } from "../app-icon";

import type { ChoiceRowProps } from "./choice-row.types";

export function ChoiceRow({ icon, title, description }: ChoiceRowProps) {
  return (
    <div role="button" aria-label={title} className="flex min-h-11 items-center gap-3.5 rounded-card border-[1.5px] border-line bg-surface p-4">
      <span className="flex size-12 items-center justify-center rounded-control bg-sand">
        <AppIcon name={icon} size={24} className="text-grape" />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="ds-text-list-title text-ink">{title}</span>
        <span className="ds-text-list-subtitle text-ink-2">{description}</span>
      </span>
      <AppIcon name="Ionicons:chevron-forward" size={20} className="text-ink-2" />
    </div>
  );
}
