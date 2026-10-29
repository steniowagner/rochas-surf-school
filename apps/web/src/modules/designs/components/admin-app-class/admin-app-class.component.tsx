import { adminAppNote } from "@/modules/designs/i18n/admin-app-note";
import { ClassDetailsScreen } from "@/modules/designs/screens/shared/class-details-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { AdminAppClassProps } from "./admin-app-class.types";

// AD-03-17: the toast after Caio was taken out of the class.
const TAKEN_OUT = { key: "takeOutSheet.done", tone: "success", params: { name: "Caio Sousa" } } as const;

export function AdminAppClass({ locale, text }: AdminAppClassProps) {
  const texts = { notes: text.classNotes, cancellationRules: text.cancellationRules };
  const frames = [
    { id: "AD-03-01", screen: <ClassDetailsScreen locale={locale} role="admin" state="open" texts={texts} /> },
    { id: "AD-03-02", screen: <ClassDetailsScreen locale={locale} role="admin" state="noInstructor" texts={texts} /> },
    { id: "AD-03-03", screen: <ClassDetailsScreen locale={locale} role="admin" state="noDeadline" texts={texts} /> },
    { id: "AD-03-04", screen: <ClassDetailsScreen locale={locale} role="admin" state="full" texts={texts} /> },
    { id: "AD-03-05", screen: <ClassDetailsScreen locale={locale} role="admin" state="noStudents" texts={texts} /> },
    { id: "AD-03-06", screen: <ClassDetailsScreen locale={locale} role="admin" state="started" texts={texts} /> },
    { id: "AD-03-07", screen: <ClassDetailsScreen locale={locale} role="admin" state="finished" texts={texts} /> },
    { id: "AD-03-08", screen: <ClassDetailsScreen locale={locale} role="admin" state="classCancelled" texts={texts} /> },
    { id: "AD-03-09", screen: <ClassDetailsScreen locale={locale} role="admin" state="open" sheet="tools" texts={texts} /> },
    { id: "AD-03-10", screen: <ClassDetailsScreen locale={locale} role="admin" state="noStudents" sheet="tools" texts={texts} /> },
    { id: "AD-03-11", screen: <ClassDetailsScreen locale={locale} role="admin" state="open" sheet="cancel" texts={texts} /> },
    { id: "AD-03-12", screen: <ClassDetailsScreen locale={locale} role="admin" state="noStudents" sheet="delete" texts={texts} /> },
    { id: "AD-03-13", screen: <ClassDetailsScreen locale={locale} role="admin" state="noStudents" sheet="deleteNotEmpty" texts={texts} /> },
    { id: "AD-03-14", screen: <ClassDetailsScreen locale={locale} role="admin" state="open" sheet="takeOut" texts={texts} /> },
    { id: "AD-03-15", screen: <ClassDetailsScreen locale={locale} role="admin" state="open" sheet="takeOutGuest" texts={texts} /> },
    { id: "AD-03-16", screen: <ClassDetailsScreen locale={locale} role="admin" state="open" sheet="person" texts={texts} /> },
    { id: "AD-03-17", screen: <ClassDetailsScreen locale={locale} role="admin" state="takenOut" toast={TAKEN_OUT} texts={texts} /> },
    { id: "AD-03-18", screen: <ClassDetailsScreen locale={locale} role="admin" state="loading" texts={texts} /> },
    { id: "AD-03-19", screen: <ClassDetailsScreen locale={locale} role="admin" state="notFound" texts={texts} /> },
    { id: "AD-03-20", screen: <ClassDetailsScreen locale={locale} role="admin" state="error" texts={texts} /> },
  ] as const;

  return (
    <DesignSection number="03" title={text.sections.class.title} description={text.sections.class.description}>
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
