import { useContext } from "react";

import { AlertMessageContext } from "./alert-message.context";

export const useAlertMessage = () => useContext(AlertMessageContext);
