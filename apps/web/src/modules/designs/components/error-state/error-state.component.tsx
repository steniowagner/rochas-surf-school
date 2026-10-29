import { AppIcon } from "../app-icon";
import { Button } from "../button";

import type { ErrorStateProps } from "./error-state.types";

export function ErrorState({ title, description, retryLabel, retrying = false }: ErrorStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-9 pb-10">
      <div className="flex size-21 items-center justify-center rounded-full bg-bad-tint text-bad">
        <AppIcon name="Ionicons:alert-circle-outline" size={38} />
      </div>
      <h3 className="ds-text-sheet-title mt-6 text-center text-ink">{title}</h3>
      <p className="ds-text-body mt-2.5 max-w-72 text-center text-ink-2">{description}</p>
      <Button variant="ink" className="mt-7 self-stretch" loading={retrying} icon={<AppIcon name="Ionicons:refresh" size={18} />}>{retryLabel}</Button>
    </div>
  );
}
