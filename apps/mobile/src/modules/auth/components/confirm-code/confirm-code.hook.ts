import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { TextInput } from "react-native";

import { routes } from "@/constants/routes";
import { useAlertMessage } from "@/providers/alert-message";

import { useRequestSignInCode } from "../../hooks/use-request-sign-in-code.hook";
import { useVerifySignInCode } from "../../hooks/use-verify-sign-in-code.hook";
import { getSignInCodeErrorKey } from "../../utils/sign-in-code-error";
import { getVerifyCodeError } from "../../utils/verify-code-error";
import { UseConfirmCodeProps } from "./confirm-code.types";

export const CODE_LENGTH = 6;
export const RESEND_COOLDOWN_MS = 30_000;

const formatCountdown = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

// Back to the screen that asked for the code; when this screen was opened directly there is nothing to go back to.
const goBackToStart = (hasName: boolean) => {
  if (router.canGoBack()) {
    return router.back();
  }

  router.replace(
    hasName ? routes.auth.createAccount() : routes.auth.emailSignIn,
  );
};

// The address has no account: Create account opens over Choose, with the email filled in.
const openCreateAccount = (email: string) => {
  router.dismissTo(routes.auth.emailChoice);
  router.push(routes.auth.createAccount({ email }));
};

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

  const requestCode = useRequestSignInCode();
  const [resendAvailableAt, setResendAvailableAt] = useState(
    () => Date.now() + RESEND_COOLDOWN_MS,
  );
  const [now, setNow] = useState(() => Date.now());

  const isVerifying = verifyCode.isPending;
  const hasName = Boolean(name);

  // The input is not editable while the request runs, so it gets the focus back afterwards.
  // It waits one tick: iOS ignores `focus()` until the field is editable again.
  useEffect(() => {
    if (!errorKey || isVerifying) {
      return;
    }

    const timeout = setTimeout(() => inputRef.current?.focus(), 0);

    return () => clearTimeout(timeout);
  }, [errorKey, isVerifying]);

  // The countdown comes from timestamps, so it stays right after the app was in the background.
  const secondsToResend = Math.max(
    0,
    Math.ceil((resendAvailableAt - now) / 1000),
  );
  const isCountingDown = secondsToResend > 0;

  useEffect(() => {
    if (!isCountingDown) {
      return;
    }

    const interval = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(interval);
  }, [isCountingDown, resendAvailableAt]);

  const verify = (codeToVerify: string) => {
    if (codeToVerify.length !== CODE_LENGTH || verifyCode.isPending) {
      return;
    }

    verifyCode.mutate(
      { email, code: codeToVerify, ...(hasName ? { name } : {}) },
      {
        onSuccess: (response) => onVerified?.(response),
        onError: (error) => {
          const { key, placement, opensCreateAccount } = getVerifyCodeError(
            error,
            hasName,
          );

          if (placement === "inline") {
            setCode("");
            setErrorKey(key);

            return;
          }

          alertMessage.show(t(key));

          if (opensCreateAccount) {
            openCreateAccount(email);
          }
        },
      },
    );
  };

  const changeCode = (value: string) => {
    setErrorKey(null);
    setCode(value);
    verify(value);
  };

  const resend = () => {
    if (isCountingDown || requestCode.isPending) {
      return;
    }

    requestCode.mutate(
      { email },
      {
        onSuccess: () => {
          setCode("");
          setErrorKey(null);
          setNow(Date.now());
          setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
        },
        onError: (error) => alertMessage.show(t(getSignInCodeErrorKey(error))),
      },
    );
  };

  return {
    code,
    isCountingDown,
    countdown: formatCountdown(secondsToResend),
    resend,
    errorMessage: errorKey ? t(errorKey) : null,
    isVerifying,
    inputRef,
    changeCode,
    confirm: () => verify(code),
    changeEmail: () => goBackToStart(hasName),
  };
};
