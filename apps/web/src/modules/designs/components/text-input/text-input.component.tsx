import { AppIcon } from "../app-icon";

import type { TextInputProps } from "./text-input.types";

export function TextInput({ icon, value = "", placeholder, status = "neutral", errorMessage, clearable = false, editable = true }: TextInputProps) {
  const showClear = clearable && editable && value !== "";
  const box = editable ? `bg-input ${status === "error" ? "border-bad" : "border-input-line"}` : "border-line bg-dim";

  return (
    <div className="flex flex-col gap-1.5">
      <div className={`flex h-13 items-center gap-2.5 rounded-control border-[1.5px] px-3.5 ${box}`}>
        {icon}
        <span className={`ds-text-body flex-1 truncate ${value === "" ? "text-ink-2" : editable ? "text-ink" : "text-ink-2"}`}>
          {value === "" ? placeholder : value}
        </span>
        {showClear ? <AppIcon name="Ionicons:close-circle" size={20} className="text-ink-2" /> : null}
      </div>
      {status === "error" && errorMessage ? <p className="ds-text-list-subtitle px-1 text-bad">{errorMessage}</p> : null}
    </div>
  );
}
