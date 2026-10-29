import { AuthFlowClosedAccount } from "../../components/auth-flow-closed-account";
import { AuthFlowEmail } from "../../components/auth-flow-email";
import { AuthFlowOnboarding } from "../../components/auth-flow-onboarding";
import { AuthFlowSignIn } from "../../components/auth-flow-sign-in";

import type { AuthFlowPageProps } from "./auth-flow.types";

export function AuthFlowPage({ locale, text }: AuthFlowPageProps) {
  const props = { locale, text };

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="ds-text-section-label text-ink-2">{text.eyebrow}</p>
        <h1 className="ds-text-wordmark text-ink">{text.title}</h1>
        <p className="ds-text-body max-w-160 text-ink-2">{text.description}</p>
      </header>
      <AuthFlowSignIn {...props} />
      <AuthFlowEmail {...props} />
      <AuthFlowOnboarding {...props} />
      <AuthFlowClosedAccount {...props} />
    </div>
  );
}
