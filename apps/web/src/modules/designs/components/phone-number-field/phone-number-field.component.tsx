import { AppIcon } from "../app-icon";
import { TextInput } from "../text-input";

import type { PhoneNumberFieldProps } from "./phone-number-field.types";

export function PhoneNumberField({ country, dialCode, value, placeholder, status, errorMessage }: PhoneNumberFieldProps) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="ds-text-list-title flex h-13 items-center gap-1.5 rounded-control border-[1.5px] border-input-line bg-input px-3 text-ink">
        {`${country} ${dialCode}`}
        <AppIcon name="Ionicons:chevron-down" size={16} className="text-ink-2" />
      </span>
      <div className="flex-1">
        <TextInput value={value} placeholder={placeholder} status={status} errorMessage={errorMessage} />
      </div>
    </div>
  );
}
