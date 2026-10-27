import { ReactNode } from "react";

import { ToastTone } from "@/components/ui/toast/toast.types";

export type AlertMessageContextValue = {
  show: (message: string, options?: AlertMessageOptions) => void;
};

export type AlertMessageOptions = {
  tone?: ToastTone;
};

export type AlertMessageProviderProps = {
  children: ReactNode;
};

export type AlertMessageContent = {
  // A new id restarts the toast when a message is shown while another one is on screen.
  id: number;
  message: string;
  tone: ToastTone;
};
