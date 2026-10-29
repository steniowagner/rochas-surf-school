import { instructorAppNote } from "@/modules/designs/i18n/instructor-app-note";
import { ClassHistoryScreen } from "@/modules/designs/screens/shared/class-history-screen";
import { TeachingClassesScreen } from "@/modules/designs/screens/shared/teaching-classes-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { InstructorAppMyClassesProps } from "./instructor-app-my-classes.types";

export function InstructorAppMyClasses({ locale, text }: InstructorAppMyClassesProps) {
  const frames = [
    { id: "IN-04-01", screen: <TeachingClassesScreen locale={locale} state="list" /> },
    { id: "IN-04-02", screen: <TeachingClassesScreen locale={locale} state="nothingOngoing" /> },
    { id: "IN-04-03", screen: <TeachingClassesScreen locale={locale} state="filtered" /> },
    { id: "IN-04-04", screen: <TeachingClassesScreen locale={locale} state="empty" /> },
    { id: "IN-04-05", screen: <TeachingClassesScreen locale={locale} state="emptyFiltered" /> },
    { id: "IN-04-06", screen: <TeachingClassesScreen locale={locale} state="loading" /> },
    { id: "IN-04-07", screen: <TeachingClassesScreen locale={locale} state="error" /> },
    { id: "IN-04-08", screen: <ClassHistoryScreen locale={locale} state="month" role="instructor" /> },
    { id: "IN-04-09", screen: <ClassHistoryScreen locale={locale} state="daySelected" role="instructor" /> },
    { id: "IN-04-10", screen: <ClassHistoryScreen locale={locale} state="emptyPeriod" role="instructor" /> },
    { id: "IN-04-11", screen: <ClassHistoryScreen locale={locale} state="loading" role="instructor" /> },
    { id: "IN-04-12", screen: <ClassHistoryScreen locale={locale} state="error" role="instructor" /> },
  ] as const;

  return (
    <DesignSection number="04" title={text.sections.myClasses.title} description={text.sections.myClasses.description}>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {frames.map(({ id, screen }) => (
          <DesignEntry key={id} id={id} title={text.entries[id].title} note={instructorAppNote(locale, text, id)}>
            {screen}
          </DesignEntry>
        ))}
      </div>
    </DesignSection>
  );
}
