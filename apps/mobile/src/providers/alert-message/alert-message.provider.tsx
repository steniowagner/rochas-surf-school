import { useCallback, useMemo, useState } from "react";

import { Toast } from "@/components/ui/toast";

import { AlertMessageContext } from "./alert-message.context";
import {
  AlertMessageContent,
  AlertMessageProviderProps,
} from "./alert-message.types";

export function AlertMessageProvider({ children }: AlertMessageProviderProps) {
  const [content, setContent] = useState<AlertMessageContent | null>(null);

  const show = useCallback((message: string) => {
    setContent((current) => ({ id: (current?.id ?? 0) + 1, message }));
  }, []);

  const hide = useCallback(() => setContent(null), []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <AlertMessageContext.Provider value={value}>
      {children}
      {content ? (
        <Toast key={content.id} message={content.message} onHidden={hide} />
      ) : null}
    </AlertMessageContext.Provider>
  );
}
