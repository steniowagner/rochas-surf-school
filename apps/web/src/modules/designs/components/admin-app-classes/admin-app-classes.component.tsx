import { adminAppNote } from "@/modules/designs/i18n/admin-app-note";
import { ClassesWeekScreen } from "@/modules/designs/screens/shared/classes-week-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { AdminAppClassesProps } from "./admin-app-classes.types";

export function AdminAppClasses({ locale, text }: AdminAppClassesProps) {
  const frames = [
    { id: "AD-02-01", screen: <ClassesWeekScreen locale={locale} state="week" role="admin" /> },
    { id: "AD-02-02", screen: <ClassesWeekScreen locale={locale} state="month" role="admin" /> },
    { id: "AD-02-03", screen: <ClassesWeekScreen locale={locale} state="filterOpen" role="admin" /> },
    { id: "AD-02-04", screen: <ClassesWeekScreen locale={locale} state="filtered" role="admin" /> },
    { id: "AD-02-05", screen: <ClassesWeekScreen locale={locale} state="empty" role="admin" /> },
    { id: "AD-02-06", screen: <ClassesWeekScreen locale={locale} state="pastEmpty" role="admin" /> },
    { id: "AD-02-07", screen: <ClassesWeekScreen locale={locale} state="loading" role="admin" /> },
    { id: "AD-02-08", screen: <ClassesWeekScreen locale={locale} state="error" role="admin" /> },
  ] as const;

  return (
    <DesignSection number="02" title={text.sections.classes.title} description={text.sections.classes.description}>
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
