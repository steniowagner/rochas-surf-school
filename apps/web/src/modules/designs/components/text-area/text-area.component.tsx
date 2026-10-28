import type { TextAreaProps } from "./text-area.types";

export function TextArea({ value, maxLength, label, placeholder }: TextAreaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? <p className="ds-text-list-subtitle px-1 text-ink-2">{label}</p> : null}
      <div className="min-h-30 rounded-control border-[1.5px] border-input-line bg-input px-3.5 py-3">
        <p className={`ds-text-body min-h-24 ${value === "" ? "text-ink-2" : "text-ink"}`}>{value === "" ? placeholder : value}</p>
      </div>
      <p className="ds-text-list-subtitle px-1 text-right text-ink-2">{`${value.length}/${maxLength}`}</p>
    </div>
  );
}
