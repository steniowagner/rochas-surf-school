import { AppIcon } from "../app-icon";

import type { CheckboxProps } from "./checkbox.types";

export function Checkbox({ checked, label, helper, variant = "plain", disabled = false }: CheckboxProps) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      aria-label={label}
      className={`flex min-h-11 items-center gap-3 ${variant === "boxed" ? "rounded-control bg-dim px-4 py-3" : ""} ${disabled ? "opacity-50" : ""}`}
    >
      <span className={`flex size-6.5 items-center justify-center rounded-checkbox border-2 ${checked ? "border-lagoon bg-lagoon text-on-color" : "border-input-line bg-input"}`}>
        {checked ? <AppIcon name="Ionicons:checkmark" size={18} /> : null}
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="ds-text-list-title text-ink">{label}</span>
        {helper ? <span className="ds-text-list-subtitle text-ink-2">{helper}</span> : null}
      </span>
    </div>
  );
}
