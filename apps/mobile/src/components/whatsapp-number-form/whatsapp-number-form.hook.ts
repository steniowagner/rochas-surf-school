import { PhoneNumberRule, RequiredRule } from "@rochas-surf-school/shared";
import { CountryCode, parsePhoneNumberFromString } from "libphonenumber-js";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "react-native";

import { getStatus, isValid } from "@/modules/auth/utils/field-validation";
import {
  formatBrazilianPhone,
  toBrazilianDigits,
} from "@/utils/brazilian-phone";
import { DEFAULT_COUNTRY, getDialCode } from "@/utils/countries";

import {
  UseWhatsappNumberFormProps,
  WhatsappNumberField,
} from "./whatsapp-number-form.types";

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

export const useWhatsappNumberForm = ({
  initialNumber,
  initialVisible,
  requireChange = false,
  isSaving,
  onSubmit,
}: UseWhatsappNumberFormProps) => {
  const { t } = useTranslation();
  const [initial] = useState(() => splitStoredNumber(initialNumber));
  const [country, setCountry] = useState<CountryCode>(initial.country);
  const [typed, setTyped] = useState(initial.typed);
  const [isTouched, setIsTouched] = useState(false);
  const [isHidden, setIsHidden] = useState(
    initialVisible === undefined ? true : !initialVisible,
  );
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const isBrazil = country === "BR";
  const shown = isBrazil ? toBrazilianDigits(typed) : typed;
  const trimmed = shown.trim();
  const whatsappNumber = toE164(trimmed, country);
  const isNumberValid = isValid(whatsappNumber, numberRules());
  const hasChanged =
    whatsappNumber !== (initialNumber ?? "") ||
    !isHidden !== (initialVisible ?? false);
  const canSubmit = isNumberValid && (!requireChange || hasChanged);

  const numberField: WhatsappNumberField = {
    value: isBrazil ? formatBrazilianPhone(shown) : typed,
    status: getStatus(trimmed, isNumberValid, isTouched),
    errorMessage: t("whatsapp.invalidNumber"),
    onChangeText: (text) => setTyped(isBrazil ? toBrazilianDigits(text) : text),
    onBlur: () => setIsTouched(true),
  };

  const submit = () => {
    if (!canSubmit || isSaving) {
      return;
    }

    Keyboard.dismiss();

    onSubmit({ whatsappNumber, whatsappVisible: !isHidden });
  };

  return {
    country,
    dialCode: getDialCode(country),
    numberField,
    canSubmit,
    isHidden,
    setIsHidden,
    isPickerVisible,
    openPicker: () => setIsPickerVisible(true),
    closePicker: () => setIsPickerVisible(false),
    selectCountry: setCountry,
    submit,
  };
};
