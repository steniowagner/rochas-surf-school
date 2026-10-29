import { studentAppNote } from "@/modules/designs/i18n/student-app-note";
import { ClassesWeekScreen } from "@/modules/designs/screens/shared/classes-week-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { StudentAppAgendaProps } from "./student-app-agenda.types";

export function StudentAppAgenda({ locale, text }: StudentAppAgendaProps) {
  const frames = [
    { id: "ST-01-01", screen: <ClassesWeekScreen locale={locale} state="week" /> },
    { id: "ST-01-02", screen: <ClassesWeekScreen locale={locale} state="month" /> },
    { id: "ST-01-03", screen: <ClassesWeekScreen locale={locale} state="filterOpen" /> },
    { id: "ST-01-04", screen: <ClassesWeekScreen locale={locale} state="filtered" /> },
    { id: "ST-01-05", screen: <ClassesWeekScreen locale={locale} state="loading" /> },
    { id: "ST-01-06", screen: <ClassesWeekScreen locale={locale} state="empty" /> },
    { id: "ST-01-07", screen: <ClassesWeekScreen locale={locale} state="error" /> },
  ] as const;

  return (
    <DesignSection number="01" title={text.sections.agenda.title} description={text.sections.agenda.description}>
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
