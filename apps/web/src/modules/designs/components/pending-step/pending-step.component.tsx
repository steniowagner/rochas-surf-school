import { AppIcon } from "../app-icon";

import type { PendingStepProps } from "./pending-step.types";

export function PendingStep({ state, title, trailing }: PendingStepProps) {
  return (
    <div className="flex min-h-13.5 items-center gap-3">
      {state === "done" ? (
        <span data-testid="step-done" className="flex size-6 items-center justify-center rounded-full bg-ok text-on-color">
          <AppIcon name="Ionicons:checkmark" size={14} />
        </span>
      ) : null}
      {state === "current" ? (
        <span data-testid="step-current" className="flex size-6 items-center justify-center rounded-full border-2 border-warn">
          <span className="size-2 rounded-full bg-warn" />
        </span>
      ) : null}
      {state === "future" ? <span data-testid="step-future" className="size-6 rounded-full border-2 border-dashed border-ink-3" /> : null}
      <span className={`ds-text-list-title flex-1 ${state === "future" ? "text-ink-3" : "text-ink"}`}>{title}</span>
      {trailing}
    </div>
  );
}
