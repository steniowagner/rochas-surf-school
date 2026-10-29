import { AppIcon } from "../app-icon";

import type { StackHeaderProps } from "./stack-header.types";

export function StackHeader({ title, showBack = true, right }: StackHeaderProps) {
  return (
    <header className="flex h-11 items-center gap-2 px-5">
      <span className="flex size-11 items-center justify-center">
        {showBack ? <AppIcon name="Ionicons:chevron-back" size={24} className="text-ink" /> : null}
      </span>
      <h1 className="ds-text-screen-title-with-back flex-1 truncate text-ink">{title}</h1>
      <span className="flex min-w-11 justify-end">{right}</span>
    </header>
  );
}
