"use client";

import { Button } from "@/components/ui/button";

import { useCopyEmailButton } from "./copy-email-button.hook";
import type { CopyEmailButtonProps } from "./copy-email-button.types";

export function CopyEmailButton({ email, labels }: CopyEmailButtonProps) {
  const { copyState, copyEmail } = useCopyEmailButton({ email });

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" onClick={copyEmail}>
        {copyState === "copied" ? labels.copied : labels.copyEmail}
        {/* The email makes each button's name unique for screen readers. */}
        <span className="sr-only"> {email}</span>
      </Button>
      {copyState === "failed" ? (
        <p role="alert" className="ds-text-list-subtitle text-bad">
          {labels.copyFailed}
        </p>
      ) : null}
    </div>
  );
}
