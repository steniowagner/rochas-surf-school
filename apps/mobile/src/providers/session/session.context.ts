import { createContext } from "react";

import { SessionContextValue } from "./session.types";

// No default: every screen that reads the session must sit under SessionProvider.
export const SessionContext = createContext<SessionContextValue | null>(null);
