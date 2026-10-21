import type { CountryCode } from "libphonenumber-js";

import type { TextInputStatus } from "@/components/ui/text-input/text-input.types";

export type PhoneNumberInput = {
  value: string;
  status: TextInputStatus;
  errorMessage: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
};

export type PhoneNumberFieldProps = {
  country: CountryCode;
  dialCode: string;
  numberInput: PhoneNumberInput;
  onSelectCountry: (country: CountryCode) => void;
  /** The accessibility label of the number input. */
  label: string;
  onSubmitEditing?: () => void;
};

export type UsePhoneNumberFieldProps = {
  /** The stored number in E.164; empty or missing starts with Brazil and an empty field. */
  initialNumber?: string | null;
};
