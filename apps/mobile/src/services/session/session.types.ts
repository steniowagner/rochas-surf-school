import type { SessionUser } from "@/navigation/resolve-flow.types";

export type SessionTokens = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

export type Session = {
  user: SessionUser;
  tokens: SessionTokens;
};
