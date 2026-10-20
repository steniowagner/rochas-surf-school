import { useEffect, useRef, useState } from "react";

import { useCancellationRules } from "@/modules/cancellation-rules/hooks/use-cancellation-rules.hook";

import type { UseRequestSeatSheetProps } from "./request-seat-sheet.types";

type RulesStep = "idle" | "leaving" | "open";

export const useRequestSeatSheet = ({ visible, discipline, onClose }: UseRequestSeatSheetProps) => {
  const [accepted, setAccepted] = useState(false);
  // The rules sheet replaces this one, never overlapping it: "leaving" while the request sheet slides down, "open" once
  // it is gone (two modals presented together take each other down).
  const [step, setStep] = useState<RulesStep>("idle");
  // The sheet library calls the `onClose` it had when the sheet was presented, so the step is read from a ref.
  const stepRef = useRef<RulesStep>("idle");

  useEffect(() => {
    stepRef.current = step;
  }, [step]);
  const [wasVisible, setWasVisible] = useState(visible);
  const rules = useCancellationRules({ enabled: visible });

  // The acceptance never outlives the sheet: whatever closes it, it opens unticked.
  if (wasVisible !== visible) {
    setWasVisible(visible);
    if (!visible) {
      setAccepted(false);
      setStep("idle");
    }
  }

  // The rule is required until the rules say the discipline has none: the API refuses a missing acceptance anyway.
  const hasRule = rules.data ? Boolean(rules.data[discipline]) : true;

  return {
    accepted,
    setAccepted,
    hasRule,
    canSubmit: !hasRule || accepted,
    sheetVisible: visible && step === "idle",
    // The request sheet leaving to make room for the rules is not the student closing it.
    handleClose: () => {
      if (stepRef.current === "leaving") {
        setStep("open");
      } else if (stepRef.current === "idle") {
        onClose();
      }
    },
    rulesVisible: step === "open",
    openRules: () => setStep("leaving"),
    closeRules: () => setStep("idle"),
  };
};
