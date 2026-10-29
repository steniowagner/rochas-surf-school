import { authFlowNote } from "@/modules/designs/i18n/auth-flow-note";
import { PendingScreen } from "@/modules/designs/screens/auth/pending-screen";
import { SchoolRulesScreen } from "@/modules/designs/screens/auth/school-rules-screen";
import { WhatsappScreen } from "@/modules/designs/screens/auth/whatsapp-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { AuthFlowOnboardingProps } from "./auth-flow-onboarding.types";

export function AuthFlowOnboarding({ locale, text }: AuthFlowOnboardingProps) {
  const { schoolRules: rules } = text;
  const screens = [
    { id: "AF-03-01", screen: <PendingScreen locale={locale} /> },
    { id: "AF-03-02", screen: <WhatsappScreen locale={locale} state="empty" /> },
    { id: "AF-03-03", screen: <WhatsappScreen locale={locale} state="filled" /> },
    { id: "AF-03-04", screen: <WhatsappScreen locale={locale} state="countryPicker" /> },
    { id: "AF-03-05", screen: <WhatsappScreen locale={locale} state="invalid" /> },
    { id: "AF-03-06", screen: <WhatsappScreen locale={locale} state="saving" /> },
    { id: "AF-03-07", screen: <WhatsappScreen locale={locale} state="saveError" /> },
    { id: "AF-03-08", screen: <SchoolRulesScreen locale={locale} state="loading" rules={rules} /> },
    { id: "AF-03-09", screen: <SchoolRulesScreen locale={locale} state="loaded" rules={rules} /> },
    { id: "AF-03-10", screen: <SchoolRulesScreen locale={locale} state="accepted" rules={rules} /> },
    { id: "AF-03-11", screen: <SchoolRulesScreen locale={locale} state="loadError" rules={rules} /> },
    { id: "AF-03-12", screen: <SchoolRulesScreen locale={locale} state="empty" rules={rules} /> },
    { id: "AF-03-13", screen: <SchoolRulesScreen locale={locale} state="outdated" rules={rules} /> },
    { id: "AF-03-14", screen: <SchoolRulesScreen locale={locale} state="loaded" variant="rulesUpdate" rules={rules} /> },
  ] as const;

  return (
    <DesignSection number="03" title={text.sections.onboarding.title} description={text.sections.onboarding.description}>
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
