import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "react-native";

import { routes } from "@/constants/routes";
import { useAlertMessage } from "@/providers/alert-message";

import { useSignInWithApple } from "../../hooks/use-sign-in-with-apple.hook";
import { useSignInWithGoogle } from "../../hooks/use-sign-in-with-google.hook";
import { getAppleApiErrorKey } from "../../utils/apple-sign-in-error";
import { getStatus, isValid, nameRules } from "../../utils/field-validation";
import { getGoogleApiErrorKey } from "../../utils/google-sign-in-error";
import { NameProvider, UseProviderNameProps } from "./provider-name.types";

const errorsByProvider: Record<
  NameProvider,
  { getKey: (error: unknown) => string; tokenInvalidKey: string }
> = {
  google: {
    getKey: getGoogleApiErrorKey,
    tokenInvalidKey: "googleSignIn.tokenInvalid",
  },
  apple: {
    getKey: getAppleApiErrorKey,
    tokenInvalidKey: "appleSignIn.tokenInvalid",
  },
};

export const useProviderName = ({
  provider,
  idToken,
  initialName = "",
  onSignedIn,
}: UseProviderNameProps) => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const googleSignIn = useSignInWithGoogle();
  const appleSignIn = useSignInWithApple();
  const signIn = provider === "apple" ? appleSignIn : googleSignIn;
  const errors = errorsByProvider[provider];
  const [name, setName] = useState(initialName);
  const [isNameTouched, setIsNameTouched] = useState(false);

  const trimmedName = name.trim();
  const isNameValid = isValid(trimmedName, nameRules());

  const nameField = {
    value: name,
    status: getStatus(trimmedName, isNameValid, isNameTouched),
    errorMessage: t("createAccount.nameInvalid"),
    onChangeText: setName,
    onBlur: () => setIsNameTouched(true),
  };

  const submit = () => {
    if (!isNameValid || signIn.isPending) {
      return;
    }

    Keyboard.dismiss();

    signIn.mutate(
      { idToken, name: trimmedName },
      {
        onSuccess: (response) => onSignedIn?.(response),
        onError: (error) => {
          const key = errors.getKey(error);

          alertMessage.show(t(key));

          // The token expired while the person typed: only a new sign-in can get another.
          if (key === errors.tokenInvalidKey) {
            router.replace(routes.auth.signIn);
          }
        },
      },
    );
  };

  return {
    nameField,
    canSubmit: isNameValid,
    isSending: signIn.isPending,
    submit,
  };
};
