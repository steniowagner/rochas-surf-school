import { useEffect, useState } from "react";

import type { CopyState } from "../results-summary/results-summary.types";
import type { UseCopyEmailButtonProps } from "./copy-email-button.types";

const COPIED_FOR_MS = 2000;

export const useCopyEmailButton = ({ email }: UseCopyEmailButtonProps) => {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  useEffect(() => {
    if (copyState !== "copied") {
      return;
    }

    const timeout = setTimeout(() => setCopyState("idle"), COPIED_FOR_MS);

    return () => clearTimeout(timeout);
  }, [copyState]);

  const copyEmail = async () => {
    // A new tap hides the previous failure until the clipboard answers again.
    setCopyState("idle");

    try {
      await navigator.clipboard.writeText(email);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return { copyState, copyEmail };
};
