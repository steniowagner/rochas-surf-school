import { AppIcon } from "../app-icon";
import { BottomModal } from "../bottom-modal";
import { TextInput } from "../text-input";

import type { CountryPickerProps } from "./country-picker.types";

export function CountryPicker({ title, searchPlaceholder, countries }: CountryPickerProps) {
  return (
    <BottomModal>
      <div className="mb-3.5 flex flex-col gap-3.5">
        <h3 className="ds-text-sheet-title text-ink">{title}</h3>
        <TextInput icon={<AppIcon name="Ionicons:search" size={19} className="text-ink-2" />} placeholder={searchPlaceholder} />
      </div>
      <ul>
        {countries.map((country) => (
          <li key={country.code} className="flex min-h-11 items-center gap-3 border-t border-line py-3">
            <span className="ds-text-list-title flex-1 text-ink">{country.name}</span>
            <span className="ds-text-body text-ink-2">{country.dialCode}</span>
          </li>
        ))}
      </ul>
    </BottomModal>
  );
}
