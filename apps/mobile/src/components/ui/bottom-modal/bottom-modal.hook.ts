import BottomSheet from "@gorhom/bottom-sheet";
import { useEffect, useRef } from "react";

import { UseBottomModalProps } from "./bottom-modal.types";

export const useBottomModal = ({ visible }: UseBottomModalProps) => {
  const bottomSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.forceClose();
    }
  }, [visible]);

  return { bottomSheetRef };
};
