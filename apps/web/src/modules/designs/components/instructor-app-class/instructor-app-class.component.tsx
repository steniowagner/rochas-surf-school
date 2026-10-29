import { instructorAppNote } from "@/modules/designs/i18n/instructor-app-note";
import { ClassDetailsScreen } from "@/modules/designs/screens/shared/class-details-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { InstructorAppClassProps } from "./instructor-app-class.types";

export function InstructorAppClass({ locale, text }: InstructorAppClassProps) {
  const texts = { notes: text.classNotes, cancellationRules: text.cancellationRules };
  const frames = [
    { id: "IN-03-01", screen: <ClassDetailsScreen locale={locale} role="instructor" state="teaches" texts={texts} /> },
    { id: "IN-03-02", screen: <ClassDetailsScreen locale={locale} role="instructor" state="notAssigned" texts={texts} /> },
    { id: "IN-03-03", screen: <ClassDetailsScreen locale={locale} role="instructor" state="noInstructor" texts={texts} /> },
    { id: "IN-03-04", screen: <ClassDetailsScreen locale={locale} role="instructor" state="full" texts={texts} /> },
    { id: "IN-03-05", screen: <ClassDetailsScreen locale={locale} role="instructor" state="guests" texts={texts} /> },
    { id: "IN-03-06", screen: <ClassDetailsScreen locale={locale} role="instructor" state="noStudents" texts={texts} /> },
    { id: "IN-03-07", screen: <ClassDetailsScreen locale={locale} role="instructor" state="started" texts={texts} /> },
    { id: "IN-03-08", screen: <ClassDetailsScreen locale={locale} role="instructor" state="finished" texts={texts} /> },
    { id: "IN-03-09", screen: <ClassDetailsScreen locale={locale} role="instructor" state="classCancelled" texts={texts} /> },
    { id: "IN-03-10", screen: <ClassDetailsScreen locale={locale} role="instructor" state="teaches" sheet="person" texts={texts} /> },
    { id: "IN-03-11", screen: <ClassDetailsScreen locale={locale} role="instructor" state="teaches" sheet="rules" texts={texts} /> },
    { id: "IN-03-12", screen: <ClassDetailsScreen locale={locale} role="instructor" state="loading" texts={texts} /> },
    { id: "IN-03-13", screen: <ClassDetailsScreen locale={locale} role="instructor" state="notFound" texts={texts} /> },
    { id: "IN-03-14", screen: <ClassDetailsScreen locale={locale} role="instructor" state="error" texts={texts} /> },
  ] as const;

  return (
    <DesignSection number="03" title={text.sections.class.title} description={text.sections.class.description}>
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
