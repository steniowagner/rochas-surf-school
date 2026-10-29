import { AppIcon } from "../app-icon";
import { Button } from "../button";

import type { DecisionCardProps } from "./decision-card.types";

export function DecisionCard({ title, subtitle, details, avatar, approveLabel, denyLabel, disabled = false, approveDisabled = false, loading, embedded = false, pressable = false }: DecisionCardProps) {
  const approveDisabledNow = approveDisabled || (disabled && loading !== "approve");

  return (
    <div className={embedded ? "flex flex-col gap-4 p-4" : "flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-card"}>
      <div role={pressable ? "button" : undefined} aria-label={pressable ? title : undefined} className="flex items-center gap-3">
        {avatar}
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="ds-text-list-title text-ink">{title}</p>
          {subtitle ? <p className="ds-text-list-subtitle text-ink-2">{subtitle}</p> : null}
          {details.map((detail) => (
            <p key={detail} className="ds-text-list-subtitle text-ink-2">{detail}</p>
          ))}
        </div>
        {pressable ? <AppIcon name="Ionicons:chevron-forward" size={18} className="text-ink-3" /> : null}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" disabled={disabled && loading !== "deny"} loading={loading === "deny"} icon={<AppIcon name="Feather:x" size={16} />}>{denyLabel}</Button>
        <Button variant="success" className="flex-1" disabled={approveDisabledNow} loading={loading === "approve"} icon={<AppIcon name="Feather:check" size={16} />}>{approveLabel}</Button>
      </div>
    </div>
  );
}
