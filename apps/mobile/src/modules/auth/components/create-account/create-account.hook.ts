import {
  EmailRule,
  MaxLengthRule,
  MinLengthRule,
  PersonNameRule,
  RequiredRule,
  ValidationRule,
  Validator,
} from "@rochas-surf-school/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { TextInputStatus } from "@/components/ui/text-input/text-input.types";

import { useRequestSignInCode } from "../../hooks/use-request-sign-in-code.hook";
import { getSignInCodeErrorKey } from "../../utils/sign-in-code-error";
import { FieldState, UseCreateAccountProps } from "./create-account.types";

// The same rules as `User.validate()` (modules/auth), so what the app accepts the backend accepts.
const nameRules = (): ValidationRule[] => [
  new RequiredRule(),
  new MinLengthRule(3),
  new MaxLengthRule(80),
  new PersonNameRule(),
];

const emailRules = (): ValidationRule[] => [
  new RequiredRule(),
  new EmailRule(),
];

const isValid = (value: string, rules: ValidationRule[]) => {
  try {
    Validator.validate([{ code: "field", value, rules }]);

    return true;
  } catch {
    return false;
  }
};

const getStatus = (
  value: string,
  isValidValue: boolean,
  isTouched: boolean,
): TextInputStatus => {
  if (value === "") {
    return "neutral";
  }

  if (isValidValue) {
    return "valid";
  }

  return isTouched ? "error" : "neutral";
};

export const useCreateAccount = ({
  onCodeRequested,
}: UseCreateAccountProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isNameTouched, setIsNameTouched] = useState(false);
  const [isEmailTouched, setIsEmailTouched] = useState(false);

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
    onChangeText: (value) => {
      requestCode.reset();
      setName(value);
    },
    onBlur: () => setIsNameTouched(true),
  };

  const emailField: FieldState = {
    value: email,
    status: getStatus(trimmedEmail, isEmailValid, isEmailTouched),
    errorMessage: t("createAccount.emailInvalid"),
    onChangeText: (value) => {
      requestCode.reset();
      setEmail(value);
    },
    onBlur: () => setIsEmailTouched(true),
  };

  const submit = () => {
    if (!canSubmit || requestCode.isPending) {
      return;
    }

    requestCode.mutate(
      { email: trimmedEmail },
      {
        onSuccess: () =>
          onCodeRequested?.({ name: trimmedName, email: trimmedEmail }),
      },
    );
  };

  const errorMessage = requestCode.isError
    ? t(getSignInCodeErrorKey(requestCode.error))
    : undefined;

  return {
    nameField,
    emailField,
    canSubmit,
    isSending: requestCode.isPending,
    errorMessage,
    submit,
  };
};
