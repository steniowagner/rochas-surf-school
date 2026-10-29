import { instructorAppNote } from "@/modules/designs/i18n/instructor-app-note";
import { ClassesWeekScreen } from "@/modules/designs/screens/shared/classes-week-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { InstructorAppClassesProps } from "./instructor-app-classes.types";

export function InstructorAppClasses({ locale, text }: InstructorAppClassesProps) {
  const frames = [
    { id: "IN-02-01", screen: <ClassesWeekScreen locale={locale} state="week" role="instructor" /> },
    { id: "IN-02-02", screen: <ClassesWeekScreen locale={locale} state="month" role="instructor" /> },
    { id: "IN-02-03", screen: <ClassesWeekScreen locale={locale} state="filterOpen" role="instructor" /> },
    { id: "IN-02-04", screen: <ClassesWeekScreen locale={locale} state="filtered" role="instructor" /> },
    { id: "IN-02-05", screen: <ClassesWeekScreen locale={locale} state="loading" role="instructor" /> },
    { id: "IN-02-06", screen: <ClassesWeekScreen locale={locale} state="empty" role="instructor" /> },
    { id: "IN-02-07", screen: <ClassesWeekScreen locale={locale} state="error" role="instructor" /> },
  ] as const;

  return (
    <DesignSection number="02" title={text.sections.classes.title} description={text.sections.classes.description}>
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
