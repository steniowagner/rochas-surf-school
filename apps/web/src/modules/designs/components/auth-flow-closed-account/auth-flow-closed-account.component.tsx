import { authFlowNote } from "@/modules/designs/i18n/auth-flow-note";
import { DeniedScreen } from "@/modules/designs/screens/auth/denied-screen";
import { ReactivationScreen } from "@/modules/designs/screens/auth/reactivation-screen";
import { RemovedScreen } from "@/modules/designs/screens/auth/removed-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { AuthFlowClosedAccountProps } from "./auth-flow-closed-account.types";

export function AuthFlowClosedAccount({ locale, text }: AuthFlowClosedAccountProps) {
  const reason = text.denialReason;
  const screens = [
    { id: "AF-04-01", screen: <ReactivationScreen locale={locale} state="notRequested" reason={reason} /> },
    { id: "AF-04-02", screen: <ReactivationScreen locale={locale} state="requesting" reason={reason} /> },
    { id: "AF-04-03", screen: <ReactivationScreen locale={locale} state="error" reason={reason} /> },
    { id: "AF-04-04", screen: <ReactivationScreen locale={locale} state="requested" reason={reason} /> },
    { id: "AF-04-05", screen: <ReactivationScreen locale={locale} state="denied" reason={reason} /> },
    { id: "AF-04-06", screen: <ReactivationScreen locale={locale} state="deniedWithoutReason" reason={reason} /> },
    { id: "AF-04-07", screen: <DeniedScreen locale={locale} reason={reason} /> },
    { id: "AF-04-08", screen: <DeniedScreen locale={locale} /> },
    { id: "AF-04-09", screen: <DeniedScreen locale={locale} reason={reason} hasSchoolNumber={false} /> },
    { id: "AF-04-10", screen: <RemovedScreen locale={locale} /> },
    { id: "AF-04-11", screen: <RemovedScreen locale={locale} hasSchoolNumber={false} /> },
    { id: "AF-04-12", screen: <RemovedScreen locale={locale} contactError /> },
  ] as const;

  return (
    <DesignSection number="04" title={text.sections.closedAccount.title} description={text.sections.closedAccount.description}>
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
