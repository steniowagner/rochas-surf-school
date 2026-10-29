import { AppIcon } from "../app-icon";
import { Button } from "../button";

import type { EmptyStateProps } from "./empty-state.types";

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-9 pb-10">
      <div className="flex size-24 -rotate-6 items-center justify-center rounded-[32px] bg-info-tint">
        <div className="rotate-6 text-lagoon">
          <AppIcon name={icon} size={42} />
        </div>
      </div>
      <h3 className="ds-text-sheet-title mt-6 text-center text-ink">{title}</h3>
      <p className="ds-text-body mt-2.5 max-w-72 text-center text-ink-2">{description}</p>
      {action ? (
        <Button className="mt-7 self-center" icon={action.icon ? <AppIcon name={action.icon} size={18} /> : undefined}>{action.label}</Button>
      ) : null}
    </div>
  );
}
