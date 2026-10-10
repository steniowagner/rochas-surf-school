import { ReactNode } from "react";

import type { SessionUser } from "@/navigation/resolve-flow.types";

export type SessionContextValue = {
  user: SessionUser | null;
  setUser: (user: SessionUser) => void;
  clearUser: () => void;
};

export type SessionProviderProps = {
  children: ReactNode;
};
