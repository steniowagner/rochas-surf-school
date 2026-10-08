import { createContext } from "react";

import { AlertMessageContextValue } from "./alert-message.types";

export const AlertMessageContext = createContext<AlertMessageContextValue>({
  show: () => {},
});
