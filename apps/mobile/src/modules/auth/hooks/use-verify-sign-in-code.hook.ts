import { useMutation } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

export type VerifySignInCodeVariables = {
  email: string;
  code: string;
  name: string;
};

export type VerifySignInCodeResponse = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
};

export const useVerifySignInCode = () =>
  useMutation({
    mutationFn: (variables: VerifySignInCodeVariables) =>
      apiPost<VerifySignInCodeResponse>("/auth/email/verify", variables),
  });
