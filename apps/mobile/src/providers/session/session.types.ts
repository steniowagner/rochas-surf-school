import { ReactNode } from "react";

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

export type SessionContextValue = {
  user: SessionUser | null;
  tokens: SessionTokens | null;
  setSession: (session: Session) => void;
  clearSession: () => void;
};

export type SessionProviderProps = {
  children: ReactNode;
};
