import { PhoneNumberRule, RequiredRule } from "@rochas-surf-school/shared";
import { CountryCode, parsePhoneNumberFromString } from "libphonenumber-js";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { getStatus, isValid } from "@/modules/auth/utils/field-validation";
import {
  formatBrazilianPhone,
  toBrazilianDigits,
} from "@/utils/brazilian-phone";
import { DEFAULT_COUNTRY, getDialCode } from "@/utils/countries";

import {
  PhoneNumberInput,
  UsePhoneNumberFieldProps,
} from "./phone-number-field.types";

const numberRules = () => [new RequiredRule(), new PhoneNumberRule()];

/** The typed number in E.164 for the country; what can't be parsed becomes a candidate the rule then refuses. */
const toE164 = (typed: string, country: CountryCode) => {
  if (typed === "") {
    return "";
  }

  return (
    parsePhoneNumberFromString(typed, country)?.number ??
    `${getDialCode(country)}${typed.replace(/\D/g, "")}`
  );
};

/** The country and the number without its code for a stored E.164 number; Brazil and empty when there is none. */
const splitStoredNumber = (stored: string | null | undefined) => {
  const parsed = stored ? parsePhoneNumberFromString(stored) : undefined;

  return {
    country: parsed?.country ?? DEFAULT_COUNTRY,
    typed: parsed?.nationalNumber ?? "",
  };
};

/** The state behind a `PhoneNumberField`: the country, the typed (and masked) number and its E.164 value. */
export const usePhoneNumberField = ({
  initialNumber,
}: UsePhoneNumberFieldProps = {}) => {
  const { t } = useTranslation();
  const [initial] = useState(() => splitStoredNumber(initialNumber));
  const [country, setCountry] = useState<CountryCode>(initial.country);
  const [typed, setTyped] = useState(initial.typed);
  const [isTouched, setIsTouched] = useState(false);

  const isBrazil = country === "BR";
  const shown = isBrazil ? toBrazilianDigits(typed) : typed;
  const trimmed = shown.trim();
  const whatsappNumber = toE164(trimmed, country);
  const isNumberValid = isValid(whatsappNumber, numberRules());

  const numberInput: PhoneNumberInput = {
    value: isBrazil ? formatBrazilianPhone(shown) : typed,
    status: getStatus(trimmed, isNumberValid, isTouched),
    errorMessage: t("whatsapp.invalidNumber"),
    onChangeText: (text) => setTyped(isBrazil ? toBrazilianDigits(text) : text),
    onBlur: () => setIsTouched(true),
  };

  return {
    country,
    dialCode: getDialCode(country),
    numberInput,
    onSelectCountry: setCountry,
    /** E.164, empty while nothing is typed. */
    whatsappNumber,
    isNumberValid,
  };
};
