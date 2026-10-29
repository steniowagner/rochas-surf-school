import { appRich } from "@/modules/designs/i18n/app-t";

import { TextButton } from "../text-button";

import type { TermsLineProps } from "./terms-line.types";

/** "By continuing, you agree to our Terms of Use and Privacy Policy", with both links. */
export function TermsLine({ locale, className = "text-ink-2" }: TermsLineProps) {
  return (
    <p className={`ds-text-list-subtitle mx-2 text-center ${className}`}>
      {appRich(locale, "auth.terms", { terms: (children) => <TextButton>{children}</TextButton>, privacy: (children) => <TextButton>{children}</TextButton> })}
    </p>
  );
}
