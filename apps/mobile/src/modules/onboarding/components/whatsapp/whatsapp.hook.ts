import { PhoneNumberRule, RequiredRule } from "@rochas-surf-school/shared";
import { router } from "expo-router";
import { CountryCode, parsePhoneNumberFromString } from "libphonenumber-js";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "react-native";

import { routes } from "@/constants/routes";
import { getStatus, isValid } from "@/modules/auth/utils/field-validation";
import { useSession } from "@/providers/session";

import { useSaveWhatsapp } from "../../hooks/use-save-whatsapp.hook";
import {
  formatBrazilianPhone,
  toBrazilianDigits,
} from "../../utils/brazilian-phone";
import { DEFAULT_COUNTRY, getDialCode } from "../../utils/countries";

import { WhatsappNumberField } from "./whatsapp.types";

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

export const useWhatsapp = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const saveWhatsapp = useSaveWhatsapp();
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [typed, setTyped] = useState("");
  const [isTouched, setIsTouched] = useState(false);
  const [isHidden, setIsHidden] = useState(true);
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const isBrazil = country === "BR";
  const shown = isBrazil ? toBrazilianDigits(typed) : typed;
  const trimmed = shown.trim();
  const whatsappNumber = toE164(trimmed, country);
  const isNumberValid = isValid(whatsappNumber, numberRules());

  const numberField: WhatsappNumberField = {
    value: isBrazil ? formatBrazilianPhone(shown) : typed,
    status: getStatus(trimmed, isNumberValid, isTouched),
    errorMessage: t("whatsapp.invalidNumber"),
    onChangeText: (text) => setTyped(isBrazil ? toBrazilianDigits(text) : text),
    onBlur: () => setIsTouched(true),
  };

  const submit = () => {
    if (!isNumberValid || saveWhatsapp.isPending) {
      return;
    }

    Keyboard.dismiss();

    saveWhatsapp.mutate(
      { whatsappNumber, whatsappVisible: !isHidden },
      // Replaced, so going back doesn't return to the WhatsApp step.
      { onSuccess: () => router.replace(routes.onboarding.schoolRules) },
    );
  };

  return {
    firstName: user?.name.trim().split(/\s+/)[0] ?? "",
    country,
    dialCode: getDialCode(country),
    numberField,
    canSubmit: isNumberValid,
    isSaving: saveWhatsapp.isPending,
    isHidden,
    setIsHidden,
    isPickerVisible,
    openPicker: () => setIsPickerVisible(true),
    closePicker: () => setIsPickerVisible(false),
    selectCountry: setCountry,
    submit,
  };
};
