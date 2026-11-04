import { useState } from "react";

import { UseConfirmSheetProps } from "./confirm-sheet.types";

/**
 * Once the sheet is closed its parent has already let go of the item, so the description it gets is empty; the sheet
 * keeps showing the one it was open with while it slides away.
 */
export const useConfirmSheet = ({
  visible,
  description,
}: UseConfirmSheetProps) => {
  const [shownDescription, setShownDescription] = useState(description);

  if (visible && description !== shownDescription) {
    setShownDescription(description);
  }

  return { description: visible ? description : shownDescription };
};
