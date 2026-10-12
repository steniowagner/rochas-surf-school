import { useState } from "react";

import { UseDenySheetProps } from "./deny-sheet.types";

export const useDenySheet = ({
  visible,
  onConfirm,
  onClose,
}: UseDenySheetProps) => {
  const [reason, setReason] = useState("");
  const [wasVisible, setWasVisible] = useState(visible);

  // The reason never outlives the sheet: whatever closes it (backdrop, drag, success), it opens empty.
  if (wasVisible !== visible) {
    setWasVisible(visible);
    if (!visible) {
      setReason("");
    }
  }

  const confirm = () => onConfirm(reason);

  const close = () => {
    setReason("");
    onClose();
  };

  return { reason, setReason, confirm, close };
};
