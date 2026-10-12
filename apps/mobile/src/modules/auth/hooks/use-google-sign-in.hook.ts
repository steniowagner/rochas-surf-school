import { router } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";

import { routes } from "@/constants/routes";
import { useAlertMessage } from "@/providers/alert-message";
import { ApiError } from "@/services/api";
import { GoogleSignin } from "@/services/google-sign-in";

import { getGoogleSignInError } from "../utils/google-sign-in-error";
import {
  SignInWithGoogleResponse,
  useSignInWithGoogle,
} from "./use-sign-in-with-google.hook";

const NAME_ERROR_PREFIX = "user.name.";

type UseGoogleSignInProps = {
  onSignedIn: (response: SignInWithGoogleResponse) => void;
};

/** The backend refused a new account because Google's name doesn't fit the name rules. */
const isNameError = (error: unknown) =>
  error instanceof ApiError &&
  error.status === 422 &&
  Boolean(error.errors[0]?.startsWith(NAME_ERROR_PREFIX));

export const useGoogleSignIn = ({ onSignedIn }: UseGoogleSignInProps) => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const signIn = useSignInWithGoogle();
  const isRunning = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  const signInWithGoogle = async () => {
    if (isRunning.current) {
      return;
    }

    isRunning.current = true;
    setIsLoading(true);

    let idToken: string | null = null;
    let googleName: string | undefined;

    try {
      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices();
      }

      const response = await GoogleSignin.signIn();

      if (response.type === "cancelled") {
        return;
      }

      idToken = response.data.idToken;
      googleName = response.data.user.name ?? undefined;

      if (!idToken) {
        throw new Error("Google returned no ID token");
      }

      onSignedIn(await signIn.mutateAsync({ idToken }));
    } catch (error) {
      if (idToken && isNameError(error)) {
        router.push(routes.auth.googleName({ idToken, name: googleName }));

        return;
      }

      const key = getGoogleSignInError(error);

      if (key) {
        alertMessage.show(t(key));
      }
    } finally {
      isRunning.current = false;
      setIsLoading(false);
    }
  };

  return { signInWithGoogle, isLoading };
};
