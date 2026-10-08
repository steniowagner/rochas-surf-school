import { ReactNode } from "react";

export type AlertMessageContextValue = {
  show: (message: string) => void;
};

export type AlertMessageProviderProps = {
  children: ReactNode;
};

export type AlertMessageContent = {
  // A new id restarts the toast when a message is shown while another one is on screen.
  id: number;
  message: string;
};
