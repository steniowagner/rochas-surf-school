import { ReactNode } from "react";

import type { SessionUser } from "@/navigation/resolve-flow.types";
import type { Session, SessionTokens } from "@/services/session/session.types";

export type { Session, SessionTokens };

export type SessionContextValue = {
  user: SessionUser | null;
  tokens: SessionTokens | null;
  // True from launch until the stored session was read and its account reloaded (spec 018, D-09).
  isRestoring: boolean;
  setSession: (session: Session) => void;
  // Replaces the account while keeping the tokens: an answer that carries the account (spec 018, D-11).
  updateUser: (user: SessionUser) => void;
  // Clears the session on the device only; `useSignOut` also tells the backend.
  clearSession: () => void;
};

export type SessionProviderProps = {
  children: ReactNode;
};
