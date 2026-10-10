import { EmailRule, RequiredRule } from "@rochas-surf-school/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "react-native";

import { useAlertMessage } from "@/providers/alert-message";

import { useRequestSignInCode } from "../../hooks/use-request-sign-in-code.hook";
import { getStatus, isValid } from "../../utils/field-validation";
import { getSignInCodeErrorKey } from "../../utils/sign-in-code-error";
import { EmailFieldState, UseEmailSignInProps } from "./email-sign-in.types";

// The same rules as `User.validate()` (modules/auth), so what the app accepts the backend accepts.
const emailRules = () => [new RequiredRule(), new EmailRule()];

export const useEmailSignIn = ({
  onCodeRequested,
  onCreateAccountPress,
}: UseEmailSignInProps) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isTouched, setIsTouched] = useState(false);

  const alertMessage = useAlertMessage();
  const requestCode = useRequestSignInCode();

  const trimmedEmail = email.trim();
  const isEmailValid = isValid(trimmedEmail, emailRules());

  const emailField: EmailFieldState = {
    value: email,
    status: getStatus(trimmedEmail, isEmailValid, isTouched),
    errorMessage: t("emailSignIn.emailInvalid"),
    onChangeText: setEmail,
    onBlur: () => setIsTouched(true),
  };

  const submit = () => {
    if (!isEmailValid || requestCode.isPending) {
      return;
    }

    Keyboard.dismiss();

    requestCode.mutate(
      { email: trimmedEmail },
      {
        onSuccess: () => onCodeRequested?.(trimmedEmail),
        onError: (error) => alertMessage.show(t(getSignInCodeErrorKey(error))),
      },
    );
  };

  return {
    emailField,
    canSubmit: isEmailValid,
    isSending: requestCode.isPending,
    submit,
    createAccount: () => onCreateAccountPress?.(trimmedEmail),
  };
};
