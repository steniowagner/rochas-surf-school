import { studentAppNote } from "@/modules/designs/i18n/student-app-note";
import { ClassHistoryScreen } from "@/modules/designs/screens/shared/class-history-screen";
import { MyClassesScreen } from "@/modules/designs/screens/student/my-classes-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { StudentAppMyClassesProps } from "./student-app-my-classes.types";

export function StudentAppMyClasses({ locale, text }: StudentAppMyClassesProps) {
  const frames = [
    { id: "ST-03-01", screen: <MyClassesScreen locale={locale} state="all" /> },
    { id: "ST-03-02", screen: <MyClassesScreen locale={locale} state="pending" /> },
    { id: "ST-03-03", screen: <MyClassesScreen locale={locale} state="confirmed" /> },
    { id: "ST-03-04", screen: <MyClassesScreen locale={locale} state="ended" /> },
    { id: "ST-03-05", screen: <MyClassesScreen locale={locale} state="sport" /> },
    { id: "ST-03-06", screen: <MyClassesScreen locale={locale} state="empty" /> },
    { id: "ST-03-07", screen: <MyClassesScreen locale={locale} state="emptyFilter" /> },
    { id: "ST-03-08", screen: <MyClassesScreen locale={locale} state="loading" /> },
    { id: "ST-03-09", screen: <MyClassesScreen locale={locale} state="error" /> },
    { id: "ST-03-10", screen: <ClassHistoryScreen locale={locale} state="month" /> },
    { id: "ST-03-11", screen: <ClassHistoryScreen locale={locale} state="daySelected" /> },
    { id: "ST-03-12", screen: <ClassHistoryScreen locale={locale} state="emptyPeriod" /> },
    { id: "ST-03-13", screen: <ClassHistoryScreen locale={locale} state="loading" /> },
    { id: "ST-03-14", screen: <ClassHistoryScreen locale={locale} state="error" /> },
  ] as const;

  return (
    <DesignSection number="03" title={text.sections.myClasses.title} description={text.sections.myClasses.description}>
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
