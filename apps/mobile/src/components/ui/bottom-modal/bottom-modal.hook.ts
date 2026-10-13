import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useEffect, useRef } from "react";

import { UseBottomModalProps } from "./bottom-modal.types";

export const useBottomModal = ({ visible }: UseBottomModalProps) => {
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

  return { bottomSheetRef };
};
