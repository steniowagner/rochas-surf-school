import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { routes } from "@/constants/routes";
import { pushScreen } from "@/navigation/push-screen";
import { useAlertMessage } from "@/providers/alert-message";
import { ApiError } from "@/services/api";
import { requestAppleCredential } from "@/services/apple-sign-in";

import { getAppleSignInError } from "../utils/apple-sign-in-error";
import {
  SignInWithAppleResponse,
  useSignInWithApple,
} from "./use-sign-in-with-apple.hook";

const NAME_ERROR_PREFIX = "user.name.";

type AppleCredential = Awaited<ReturnType<typeof requestAppleCredential>>;

type UseAppleSignInProps = {
  onSignedIn: (response: SignInWithAppleResponse) => void;
};

/** The backend refused a new account because the name is missing or doesn't fit the name rules. */
const isNameError = (error: unknown) =>
  error instanceof ApiError &&
  error.status === 422 &&
  Boolean(error.errors[0]?.startsWith(NAME_ERROR_PREFIX));

/** Apple gives the name only at the first authorization, and as separate parts. */
const joinName = (fullName: AppleCredential["fullName"]) => {
  const parts = [fullName?.givenName, fullName?.familyName];

  return parts.filter(Boolean).join(" ") || undefined;
};

export const useAppleSignIn = ({ onSignedIn }: UseAppleSignInProps) => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const signIn = useSignInWithApple();
  const isRunning = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  const signInWithApple = async () => {
    if (isRunning.current) {
      return;
    }

    isRunning.current = true;
    setIsLoading(true);

    let idToken: string | null = null;
    let appleName: string | undefined;

    try {
      const credential = await requestAppleCredential();

      idToken = credential.identityToken;
      appleName = joinName(credential.fullName);

      if (!idToken) {
        throw new Error("Apple returned no identity token");
      }

      onSignedIn(await signIn.mutateAsync({ idToken, name: appleName }));
    } catch (error) {
      if (idToken && isNameError(error)) {
        pushScreen(
          routes.auth.providerName({
            provider: "apple",
            idToken,
            name: appleName,
          }),
        );

        return;
      }

      const key = getAppleSignInError(error);

      if (key) {
        alertMessage.show(t(key));
      }
    } finally {
      isRunning.current = false;
      setIsLoading(false);
    }
  };

  return { signInWithApple, isLoading };
};
