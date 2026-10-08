import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { TextInput } from "react-native";

import { useAlertMessage } from "@/providers/alert-message";

import { useVerifySignInCode } from "../../hooks/use-verify-sign-in-code.hook";
import { getVerifyCodeError } from "../../utils/verify-code-error";
import { UseConfirmCodeProps } from "./confirm-code.types";

export const CODE_LENGTH = 6;

export const useConfirmCode = ({
  email,
  name,
  onVerified,
}: UseConfirmCodeProps) => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const verifyCode = useVerifySignInCode();
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState("");
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const isVerifying = verifyCode.isPending;

  // The input is not editable while the request runs, so it gets the focus back afterwards.
  useEffect(() => {
    if (errorKey && !isVerifying) {
      inputRef.current?.focus();
    }
  }, [errorKey, isVerifying]);

  const verify = (codeToVerify: string) => {
    if (codeToVerify.length !== CODE_LENGTH || verifyCode.isPending) {
      return;
    }

    verifyCode.mutate(
      { email, code: codeToVerify, name },
      {
        onSuccess: (response) => onVerified?.(response),
        onError: (error) => {
          const { key, placement } = getVerifyCodeError(error);

          if (placement === "inline") {
            setCode("");
            setErrorKey(key);

            return;
          }

          alertMessage.show(t(key));
        },
      },
    );
  };

  const changeCode = (value: string) => {
    setErrorKey(null);
    setCode(value);
    verify(value);
  };

  return {
    code,
    errorMessage: errorKey ? t(errorKey) : null,
    isVerifying,
    inputRef,
    changeCode,
    confirm: () => verify(code),
    changeEmail: () => router.back(),
  };
};
