import { useCallback, useMemo, useState } from "react";

import { SessionContext } from "./session.context";
import { Session, SessionProviderProps } from "./session.types";

// Keeps the signed-in account and its tokens in memory only: nothing is stored on the device, so a restart signs out.
export function SessionProvider({ children }: SessionProviderProps) {
  const [session, setSession] = useState<Session | null>(null);

  const clearSession = useCallback(() => setSession(null), []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      tokens: session?.tokens ?? null,
      setSession,
      clearSession,
    }),
    [session, clearSession],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
