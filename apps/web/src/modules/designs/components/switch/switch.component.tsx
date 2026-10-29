import type { SwitchProps } from "./switch.types";

export function Switch({ value, label }: SwitchProps) {
  return (
    <span role="switch" aria-checked={value} aria-label={label} className={`flex h-8 w-13 items-center rounded-full p-0.5 ${value ? "justify-end bg-lagoon" : "justify-start bg-line"}`}>
      <span className="size-7 rounded-full bg-white shadow-card" />
    </span>
  );
}
