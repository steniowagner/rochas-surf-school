import { useState } from "react";

import { useCancellationRules } from "@/modules/cancellation-rules/hooks/use-cancellation-rules.hook";

import type { UseRequestSeatSheetProps } from "./request-seat-sheet.types";

export const useRequestSeatSheet = ({ visible, discipline }: UseRequestSeatSheetProps) => {
  const [accepted, setAccepted] = useState(false);
  const [rulesVisible, setRulesVisible] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);
  const rules = useCancellationRules({ enabled: visible });

  // The acceptance never outlives the sheet: whatever closes it, it opens unticked.
  if (wasVisible !== visible) {
    setWasVisible(visible);
    if (!visible) {
      setAccepted(false);
      setRulesVisible(false);
    }
  }

  // The rule is required until the rules say the discipline has none: the API refuses a missing acceptance anyway.
  const hasRule = rules.data ? Boolean(rules.data[discipline]) : true;

  return {
    accepted,
    setAccepted,
    hasRule,
    canSubmit: !hasRule || accepted,
    rulesVisible,
    openRules: () => setRulesVisible(true),
    closeRules: () => setRulesVisible(false),
  };
};
