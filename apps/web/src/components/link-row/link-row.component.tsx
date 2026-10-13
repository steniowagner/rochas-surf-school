import { ChevronRight } from "lucide-react";

import type { LinkRowProps } from "./link-row.types";

export function LinkRow({ href, icon, title, description }: LinkRowProps) {
  return (
    <a
      href={href}
      className="flex min-h-11 items-center gap-3.5 rounded-card border border-line bg-surface p-4"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-sand text-grape">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="ds-text-list-title text-ink">{title}</span>
        <span className="ds-text-list-subtitle text-ink-2">{description}</span>
      </span>
      <ChevronRight size={20} strokeWidth={2} className="shrink-0 text-ink-2" aria-hidden />
    </a>
  );
}
