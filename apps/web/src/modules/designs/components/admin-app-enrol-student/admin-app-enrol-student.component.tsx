import { adminAppNote } from "@/modules/designs/i18n/admin-app-note";
import { EnrolStudentScreen } from "@/modules/designs/screens/admin/enrol-student-screen";
import { HomeScreen } from "@/modules/designs/screens/admin/home-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { AdminAppEnrolStudentProps } from "./admin-app-enrol-student.types";

// AD-08-09: Caio enrolled; the screen went back to the home that opened it.
const STUDENT_ENROLLED = { key: "enrolStudent.done", params: { name: "Caio Sousa" } };

export function AdminAppEnrolStudent({ locale, text }: AdminAppEnrolStudentProps) {
  const frames = [
    { id: "AD-08-01", screen: <EnrolStudentScreen locale={locale} state="students" /> },
    { id: "AD-08-02", screen: <EnrolStudentScreen locale={locale} state="studentChosen" /> },
    { id: "AD-08-03", screen: <EnrolStudentScreen locale={locale} state="noStudents" /> },
    { id: "AD-08-04", screen: <EnrolStudentScreen locale={locale} state="studentsLoading" /> },
    { id: "AD-08-05", screen: <EnrolStudentScreen locale={locale} state="trial" /> },
    { id: "AD-08-06", screen: <EnrolStudentScreen locale={locale} state="classes" /> },
    { id: "AD-08-07", screen: <EnrolStudentScreen locale={locale} state="noClasses" /> },
    { id: "AD-08-08", screen: <EnrolStudentScreen locale={locale} state="classesLoading" /> },
    { id: "AD-08-09", screen: <HomeScreen locale={locale} state="home" toast={STUDENT_ENROLLED} /> },
  ] as const;

  return (
    <DesignSection number="08" title={text.sections.enrolStudent.title} description={text.sections.enrolStudent.description}>
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
