import { useEffect, useRef, useSyncExternalStore } from "react";

import { restoreSession } from "@/services/session/session.restore";
import {
  clearSession,
  getSnapshot,
  setSession,
  subscribe,
  updateUser,
} from "@/services/session/session.store";

import { SessionContext } from "./session.context";
import { SessionProviderProps } from "./session.types";

// The session lives in `services/session` (stored on the device, renewed by the API client); this only exposes it to React.
export function SessionProvider({ children }: SessionProviderProps) {
  const { session, restoring } = useSyncExternalStore(subscribe, getSnapshot);
  const restoreStarted = useRef(false);

  useEffect(() => {
    if (restoreStarted.current) {
      return;
    }

    restoreStarted.current = true;
    void restoreSession();
  }, []);

  const value = {
    user: session?.user ?? null,
    tokens: session?.tokens ?? null,
    isRestoring: restoring,
    setSession,
    updateUser,
    clearSession,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
