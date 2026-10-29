import { adminAppNote } from "@/modules/designs/i18n/admin-app-note";
import { PeopleScreen } from "@/modules/designs/screens/shared/people-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { AdminAppPeopleProps } from "./admin-app-people.types";

export function AdminAppPeople({ locale, text }: AdminAppPeopleProps) {
  const frames = [
    { id: "AD-09-01", screen: <PeopleScreen locale={locale} state="list" role="admin" /> },
    { id: "AD-09-02", screen: <PeopleScreen locale={locale} state="list" role="admin" adminSheet="student" /> },
    { id: "AD-09-03", screen: <PeopleScreen locale={locale} state="list" role="admin" adminSheet="instructor" /> },
    { id: "AD-09-04", screen: <PeopleScreen locale={locale} state="list" role="admin" adminSheet="admin" /> },
    { id: "AD-09-05", screen: <PeopleScreen locale={locale} state="list" role="admin" adminSheet="roleConfirm" /> },
    { id: "AD-09-06", screen: <PeopleScreen locale={locale} state="list" role="admin" adminSheet="removeConfirm" /> },
  ] as const;

  return (
    <DesignSection number="09" title={text.sections.people.title} description={text.sections.people.description}>
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
