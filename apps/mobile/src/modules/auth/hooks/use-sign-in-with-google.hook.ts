import { useMutation } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import { VerifySignInCodeResponse } from "./use-verify-sign-in-code.hook";

export type SignInWithGoogleVariables = {
  idToken: string;
  /** Sent only after the backend asked for a name (422 `user.name.*`). */
  name?: string;
};

export type SignInWithGoogleResponse = VerifySignInCodeResponse;

export const useSignInWithGoogle = () =>
  useMutation({
    mutationFn: (variables: SignInWithGoogleVariables) =>
      apiPost<SignInWithGoogleResponse>("/auth/google", variables),
  });
