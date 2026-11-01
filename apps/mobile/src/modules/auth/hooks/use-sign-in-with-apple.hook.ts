import { useMutation } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import { VerifySignInCodeResponse } from "./use-verify-sign-in-code.hook";

export type SignInWithAppleVariables = {
  idToken: string;
  /** The name of a new account: Apple's token carries none. */
  name?: string;
};

export type SignInWithAppleResponse = VerifySignInCodeResponse;

export const useSignInWithApple = () =>
  useMutation({
    mutationFn: (variables: SignInWithAppleVariables) =>
      apiPost<SignInWithAppleResponse>("/auth/apple", variables),
  });
