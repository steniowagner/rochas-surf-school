import type { SegmentedControlProps } from "./segmented-control.types";

export function SegmentedControl({ options, value }: SegmentedControlProps) {
  return (
    <div role="tablist" className="flex gap-1 rounded-full bg-sand p-1">
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <span
            key={option.value}
            role="tab"
            aria-selected={selected}
            className={`ds-text-chip flex min-h-11 flex-1 items-center justify-center truncate rounded-full px-1 ${selected ? "bg-surface text-ink shadow-icon-button" : "text-ink-2"}`}
          >
            {option.label}
          </span>
        );
      })}
    </div>
  );
}
