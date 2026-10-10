import { useCallback, useMemo, useState } from "react";

import type { SessionUser } from "@/navigation/resolve-flow.types";

import { SessionContext } from "./session.context";
import { SessionProviderProps } from "./session.types";

// Keeps the signed-in account in memory only: nothing is stored on the device, so a restart signs out.
export function SessionProvider({ children }: SessionProviderProps) {
  const [user, setUser] = useState<SessionUser | null>(null);

  const clearUser = useCallback(() => setUser(null), []);

  const value = useMemo(
    () => ({ user, setUser, clearUser }),
    [user, clearUser],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
