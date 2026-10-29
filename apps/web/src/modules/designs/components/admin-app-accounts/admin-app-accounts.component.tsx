import { adminAppNote } from "@/modules/designs/i18n/admin-app-note";
import { ReactivationsScreen } from "@/modules/designs/screens/admin/reactivations-screen";
import { RegistrationsScreen } from "@/modules/designs/screens/admin/registrations-screen";
import { RemovedAccountsScreen } from "@/modules/designs/screens/admin/removed-accounts-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { AdminAppAccountsProps } from "./admin-app-accounts.types";

export function AdminAppAccounts({ locale, text }: AdminAppAccountsProps) {
  const frames = [
    { id: "AD-07-01", screen: <RegistrationsScreen locale={locale} state="ready" /> },
    { id: "AD-07-02", screen: <RegistrationsScreen locale={locale} state="denySheet" /> },
    { id: "AD-07-03", screen: <RegistrationsScreen locale={locale} state="personSheet" /> },
    { id: "AD-07-04", screen: <RegistrationsScreen locale={locale} state="empty" /> },
    { id: "AD-07-05", screen: <RegistrationsScreen locale={locale} state="loading" /> },
    { id: "AD-07-06", screen: <RegistrationsScreen locale={locale} state="error" /> },
    { id: "AD-07-07", screen: <ReactivationsScreen locale={locale} state="ready" /> },
    { id: "AD-07-08", screen: <ReactivationsScreen locale={locale} state="denySheet" /> },
    { id: "AD-07-09", screen: <ReactivationsScreen locale={locale} state="empty" /> },
    { id: "AD-07-10", screen: <ReactivationsScreen locale={locale} state="loading" /> },
    { id: "AD-07-11", screen: <ReactivationsScreen locale={locale} state="error" /> },
    { id: "AD-07-12", screen: <RemovedAccountsScreen locale={locale} state="ready" /> },
    { id: "AD-07-13", screen: <RemovedAccountsScreen locale={locale} state="empty" /> },
    { id: "AD-07-14", screen: <RemovedAccountsScreen locale={locale} state="loading" /> },
    { id: "AD-07-15", screen: <RemovedAccountsScreen locale={locale} state="error" /> },
  ] as const;

  return (
    <DesignSection number="07" title={text.sections.accounts.title} description={text.sections.accounts.description}>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {frames.map(({ id, screen }) => (
          <DesignEntry key={id} id={id} title={text.entries[id].title} note={adminAppNote(locale, text, id)}>
            {screen}
          </DesignEntry>
        ))}
      </div>
    </DesignSection>
  );
}
