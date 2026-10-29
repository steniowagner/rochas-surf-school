import { SignInScreen } from "@/modules/designs/screens/auth/sign-in-screen";
import { authFlowNote } from "@/modules/designs/i18n/auth-flow-note";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { AuthFlowSignInProps } from "./auth-flow-sign-in.types";

export function AuthFlowSignIn({ locale, text }: AuthFlowSignInProps) {
  const screens = [
    { id: "AF-01-01", screen: <SignInScreen locale={locale} /> },
    { id: "AF-01-02", screen: <SignInScreen locale={locale} languageSheetOpen /> },
    { id: "AF-01-03", screen: <SignInScreen locale={locale} googleLoading /> },
    { id: "AF-01-04", screen: <SignInScreen locale={locale} toastKey="googleSignIn.tokenInvalid" /> },
    { id: "AF-01-05", screen: <SignInScreen locale={locale} toastKey="session.expired" /> },
  ] as const;

  return (
    <DesignSection number="01" title={text.sections.signIn.title} description={text.sections.signIn.description}>
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
