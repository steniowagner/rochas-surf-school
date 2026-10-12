import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "react-native";

import { routes } from "@/constants/routes";
import { useAlertMessage } from "@/providers/alert-message";

import { useSignInWithGoogle } from "../../hooks/use-sign-in-with-google.hook";
import { getStatus, isValid, nameRules } from "../../utils/field-validation";
import { getGoogleApiErrorKey } from "../../utils/google-sign-in-error";
import { UseGoogleNameProps } from "./google-name.types";

const TOKEN_INVALID_KEY = "googleSignIn.tokenInvalid";

export const useGoogleName = ({
  idToken,
  initialName = "",
  onSignedIn,
}: UseGoogleNameProps) => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const signIn = useSignInWithGoogle();
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
          const key = getGoogleApiErrorKey(error);

          alertMessage.show(t(key));

          // The token expired while the person typed: only a new Google sign-in can get another.
          if (key === TOKEN_INVALID_KEY) {
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
