import { studentAppNote } from "@/modules/designs/i18n/student-app-note";
import { PeopleScreen } from "@/modules/designs/screens/shared/people-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { StudentAppSchoolProps } from "./student-app-school.types";

export function StudentAppSchool({ locale, text }: StudentAppSchoolProps) {
  const frames = [
    { id: "ST-04-01", screen: <PeopleScreen locale={locale} state="list" /> },
    { id: "ST-04-02", screen: <PeopleScreen locale={locale} state="filtered" /> },
    { id: "ST-04-03", screen: <PeopleScreen locale={locale} state="empty" /> },
    { id: "ST-04-04", screen: <PeopleScreen locale={locale} state="loading" /> },
    { id: "ST-04-05", screen: <PeopleScreen locale={locale} state="error" /> },
    { id: "ST-04-06", screen: <PeopleScreen locale={locale} state="sheet" /> },
    { id: "ST-04-07", screen: <PeopleScreen locale={locale} state="sheetNotShared" /> },
    { id: "ST-04-08", screen: <PeopleScreen locale={locale} state="whatsappUnavailable" /> },
  ] as const;

  return (
    <DesignSection number="04" title={text.sections.school.title} description={text.sections.school.description}>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {frames.map(({ id, screen }) => (
          <DesignEntry key={id} id={id} title={text.entries[id].title} note={studentAppNote(locale, text, id)}>
            {screen}
          </DesignEntry>
        ))}
      </div>
    </DesignSection>
  );
}
