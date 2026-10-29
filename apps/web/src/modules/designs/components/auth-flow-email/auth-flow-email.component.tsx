import { authFlowNote } from "@/modules/designs/i18n/auth-flow-note";
import { ConfirmCodeScreen } from "@/modules/designs/screens/auth/confirm-code-screen";
import { CreateAccountScreen } from "@/modules/designs/screens/auth/create-account-screen";
import { EmailChoiceScreen } from "@/modules/designs/screens/auth/email-choice-screen";
import { EmailSignInScreen } from "@/modules/designs/screens/auth/email-sign-in-screen";
import { GoogleNameScreen } from "@/modules/designs/screens/auth/google-name-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { AuthFlowEmailProps } from "./auth-flow-email.types";

export function AuthFlowEmail({ locale, text }: AuthFlowEmailProps) {
  const screens = [
    { id: "AF-02-01", screen: <EmailChoiceScreen locale={locale} /> },
    { id: "AF-02-02", screen: <EmailSignInScreen locale={locale} state="empty" /> },
    { id: "AF-02-03", screen: <EmailSignInScreen locale={locale} state="invalid" /> },
    { id: "AF-02-04", screen: <EmailSignInScreen locale={locale} state="sending" /> },
    { id: "AF-02-05", screen: <EmailSignInScreen locale={locale} state="sendError" /> },
    { id: "AF-02-06", screen: <CreateAccountScreen locale={locale} state="empty" /> },
    { id: "AF-02-07", screen: <CreateAccountScreen locale={locale} state="invalid" /> },
    { id: "AF-02-08", screen: <CreateAccountScreen locale={locale} state="sending" /> },
    { id: "AF-02-09", screen: <CreateAccountScreen locale={locale} state="sendError" /> },
    { id: "AF-02-10", screen: <ConfirmCodeScreen locale={locale} state="counting" /> },
    { id: "AF-02-11", screen: <ConfirmCodeScreen locale={locale} state="resend" /> },
    { id: "AF-02-12", screen: <ConfirmCodeScreen locale={locale} state="wrongCode" /> },
    { id: "AF-02-13", screen: <ConfirmCodeScreen locale={locale} state="verifying" /> },
    { id: "AF-02-14", screen: <ConfirmCodeScreen locale={locale} state="errorToast" /> },
    { id: "AF-02-15", screen: <GoogleNameScreen locale={locale} state="empty" /> },
    { id: "AF-02-16", screen: <GoogleNameScreen locale={locale} state="invalid" /> },
    { id: "AF-02-17", screen: <GoogleNameScreen locale={locale} state="sending" /> },
    { id: "AF-02-18", screen: <GoogleNameScreen locale={locale} state="error" /> },
  ] as const;

  return (
    <DesignSection number="02" title={text.sections.email.title} description={text.sections.email.description}>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {screens.map(({ id, screen }) => (
          <DesignEntry key={id} id={id} title={text.entries[id].title} note={authFlowNote(locale, text, id)}>
            {screen}
          </DesignEntry>
        ))}
      </div>
    </DesignSection>
  );
}
