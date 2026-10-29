import { AppIcon } from "../app-icon";

import type { StackHeaderProps } from "./stack-header.types";

export function StackHeader({ title, showBack = true, right }: StackHeaderProps) {
  return (
    <header className="grid h-11 grid-cols-[2.75rem_1fr_2.75rem] items-center px-5">
      <span className="flex size-11 items-center justify-center">
        {showBack ? <AppIcon name="Ionicons:chevron-back" size={24} className="text-ink" /> : null}
      </span>
      <h1 className="ds-text-screen-title-with-back truncate text-center text-ink">{title}</h1>
      <span className="flex justify-end">{right}</span>
    </header>
  );
}
