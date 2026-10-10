import type { CountryCode } from "libphonenumber-js";

export type CountryPickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: CountryCode) => void;
};

export type UseCountryPickerProps = Pick<
  CountryPickerProps,
  "onClose" | "onSelect"
>;
