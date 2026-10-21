import { useState } from "react";
import { Keyboard } from "react-native";

import { usePhoneNumberField } from "@/components/phone-number-field";

import { UseWhatsappNumberFormProps } from "./whatsapp-number-form.types";

export const useWhatsappNumberForm = ({
  initialNumber,
  initialVisible,
  requireChange = false,
  isSaving,
  onSubmit,
}: UseWhatsappNumberFormProps) => {
  const phone = usePhoneNumberField({ initialNumber });
  const [isHidden, setIsHidden] = useState(
    initialVisible === undefined ? true : !initialVisible,
  );

  const hasChanged =
    phone.whatsappNumber !== (initialNumber ?? "") ||
    !isHidden !== (initialVisible ?? false);
  const canSubmit = phone.isNumberValid && (!requireChange || hasChanged);

  const submit = () => {
    if (!canSubmit || isSaving) {
      return;
    }

    Keyboard.dismiss();

    onSubmit({
      whatsappNumber: phone.whatsappNumber,
      whatsappVisible: !isHidden,
    });
  };

  return {
    phone,
    canSubmit,
    isHidden,
    setIsHidden,
    submit,
  };
};
