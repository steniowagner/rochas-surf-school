import { useState } from "react";

import type { UseCancelClassSheetProps } from "./cancel-class-sheet.types";

export const useCancelClassSheet = ({
  visible,
  onConfirm,
  onClose,
}: UseCancelClassSheetProps) => {
  const [message, setMessage] = useState("");
  const [wasVisible, setWasVisible] = useState(visible);

  // The message never outlives the sheet: whatever closes it (backdrop, drag, success), it opens empty.
  if (wasVisible !== visible) {
    setWasVisible(visible);
    if (!visible) {
      setMessage("");
    }
  }

  const confirm = () => onConfirm(message.trim() === "" ? undefined : message.trim());

  const close = () => {
    setMessage("");
    onClose();
  };

  return { message, setMessage, confirm, close };
};
