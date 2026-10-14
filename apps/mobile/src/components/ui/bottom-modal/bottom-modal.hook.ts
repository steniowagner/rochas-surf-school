import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useEffect, useRef } from "react";

import { UseBottomModalProps } from "./bottom-modal.types";

export const useBottomModal = ({ visible, onClose }: UseBottomModalProps) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const wasVisible = useRef(false);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else if (wasVisible.current) {
      // A sheet that was never presented has nothing to dismiss.
      bottomSheetRef.current?.dismiss();
    }

    wasVisible.current = visible;
  }, [visible]);

  // The sheet is already gone when it was dragged or tapped away: it must not be dismissed again, or the next
  // `present()` after the parent resets `visible` can be swallowed and the sheet never opens again.
  const handleDismiss = () => {
    wasVisible.current = false;
    onClose();
  };

  return { bottomSheetRef, handleDismiss };
};
