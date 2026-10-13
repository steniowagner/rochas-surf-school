import type { CountryCode } from "libphonenumber-js";

export type CountryOption = {
  code: CountryCode;
  // Localized to the app language.
  name: string;
  // `+55`
  dialCode: string;
};
