import { AppIcon } from "../app-icon";

import type { StepTabsProps } from "./step-tabs.types";

export function StepTabs({ steps, selected }: StepTabsProps) {
  return (
    <div role="tablist" className="flex gap-1 rounded-card bg-sand p-1">
      {steps.map((step, index) => {
        const isSelected = step.key === selected;

        return (
          <div
            key={step.key}
            role="tab"
            aria-selected={isSelected}
            aria-disabled={step.disabled ?? false}
            aria-label={`${step.label}, ${step.value}`}
            className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-card p-2 ${isSelected ? "bg-surface shadow-icon-button" : ""} ${step.disabled ? "opacity-50" : ""}`}
          >
            <span className={`ds-text-chip flex size-7 shrink-0 items-center justify-center rounded-full text-on-color ${step.done ? "bg-ok" : "bg-tan"}`}>
              {step.done ? <AppIcon name="Ionicons:checkmark" size={16} /> : index + 1}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="ds-text-chip truncate text-ink-2">{step.label}</span>
              <span className="ds-text-list-subtitle truncate text-ink">{step.value}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
