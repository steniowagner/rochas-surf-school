import {
  EmailRule,
  RequiredRule,
  ValidationRule,
} from "@rochas-surf-school/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "react-native";

import { useAlertMessage } from "@/providers/alert-message";

import { useRequestSignInCode } from "../../hooks/use-request-sign-in-code.hook";
import { getStatus, isValid, nameRules } from "../../utils/field-validation";
import { getSignInCodeErrorKey } from "../../utils/sign-in-code-error";
import { FieldState, UseCreateAccountProps } from "./create-account.types";

const emailRules = (): ValidationRule[] => [
  new RequiredRule(),
  new EmailRule(),
];

export const useCreateAccount = ({
  initialEmail = "",
  onCodeRequested,
}: UseCreateAccountProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [isNameTouched, setIsNameTouched] = useState(false);
  const [isEmailTouched, setIsEmailTouched] = useState(false);

  const alertMessage = useAlertMessage();
  const requestCode = useRequestSignInCode();

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const isNameValid = isValid(trimmedName, nameRules());
  const isEmailValid = isValid(trimmedEmail, emailRules());
  const canSubmit = isNameValid && isEmailValid;

  const nameField: FieldState = {
    value: name,
    status: getStatus(trimmedName, isNameValid, isNameTouched),
    errorMessage: t("createAccount.nameInvalid"),
    onChangeText: setName,
    onBlur: () => setIsNameTouched(true),
  };

  const emailField: FieldState = {
    value: email,
    status: getStatus(trimmedEmail, isEmailValid, isEmailTouched),
    errorMessage: t("createAccount.emailInvalid"),
    onChangeText: setEmail,
    onBlur: () => setIsEmailTouched(true),
  };

  const submit = () => {
    if (!canSubmit || requestCode.isPending) {
      return;
    }

    Keyboard.dismiss();

    requestCode.mutate(
      { email: trimmedEmail },
      {
        onSuccess: () =>
          onCodeRequested?.({ name: trimmedName, email: trimmedEmail }),
        onError: (error) => alertMessage.show(t(getSignInCodeErrorKey(error))),
      },
    );
  };

  return {
    nameField,
    emailField,
    canSubmit,
    isSending: requestCode.isPending,
    submit,
  };
};
