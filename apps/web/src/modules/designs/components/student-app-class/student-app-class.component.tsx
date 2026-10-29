import { studentAppNote } from "@/modules/designs/i18n/student-app-note";
import { ClassDetailsScreen } from "@/modules/designs/screens/shared/class-details-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { StudentAppClassProps } from "./student-app-class.types";

export function StudentAppClass({ locale, text }: StudentAppClassProps) {
  const texts = { denialReason: text.denialReason, takeOutReason: text.takeOutReason, notes: text.classNotes };
  const frames = [
    { id: "ST-02-01", screen: <ClassDetailsScreen locale={locale} state="open" texts={texts} /> },
    { id: "ST-02-02", screen: <ClassDetailsScreen locale={locale} state="open" sheet="request" texts={texts} /> },
    { id: "ST-02-03", screen: <ClassDetailsScreen locale={locale} state="open" sheet="requestSending" texts={texts} /> },
    { id: "ST-02-04", screen: <ClassDetailsScreen locale={locale} state="open" sheet="requestNoDeadline" texts={texts} /> },
    { id: "ST-02-05", screen: <ClassDetailsScreen locale={locale} state="pending" toast={{ key: "enrolment.requestSheet.done", tone: "success" }} texts={texts} /> },
    { id: "ST-02-06", screen: <ClassDetailsScreen locale={locale} state="pending" texts={texts} /> },
    { id: "ST-02-07", screen: <ClassDetailsScreen locale={locale} state="pending" sheet="withdraw" texts={texts} /> },
    { id: "ST-02-08", screen: <ClassDetailsScreen locale={locale} state="fullWaitingList" texts={texts} /> },
    { id: "ST-02-09", screen: <ClassDetailsScreen locale={locale} state="fullWaitingList" sheet="requestWaitingList" texts={texts} /> },
    { id: "ST-02-10", screen: <ClassDetailsScreen locale={locale} state="waitingList" texts={texts} /> },
    { id: "ST-02-11", screen: <ClassDetailsScreen locale={locale} state="fullClosed" texts={texts} /> },
    { id: "ST-02-12", screen: <ClassDetailsScreen locale={locale} state="approved" texts={texts} /> },
    { id: "ST-02-13", screen: <ClassDetailsScreen locale={locale} state="approved" sheet="cancelSeat" texts={texts} /> },
    { id: "ST-02-14", screen: <ClassDetailsScreen locale={locale} state="cancelled" toast={{ key: "enrolment.cancelSeatSheet.done", tone: "success" }} texts={texts} /> },
    { id: "ST-02-15", screen: <ClassDetailsScreen locale={locale} state="approvedPassed" texts={texts} /> },
    { id: "ST-02-16", screen: <ClassDetailsScreen locale={locale} state="approvedNoDeadline" texts={texts} /> },
    { id: "ST-02-17", screen: <ClassDetailsScreen locale={locale} state="denied" texts={texts} /> },
    { id: "ST-02-18", screen: <ClassDetailsScreen locale={locale} state="denied" sheet="denial" texts={texts} /> },
    { id: "ST-02-19", screen: <ClassDetailsScreen locale={locale} state="withdrawn" texts={texts} /> },
    { id: "ST-02-20", screen: <ClassDetailsScreen locale={locale} state="cancelled" texts={texts} /> },
    { id: "ST-02-21", screen: <ClassDetailsScreen locale={locale} state="expired" texts={texts} /> },
    { id: "ST-02-22", screen: <ClassDetailsScreen locale={locale} state="takenOut" texts={texts} /> },
    { id: "ST-02-23", screen: <ClassDetailsScreen locale={locale} state="started" texts={texts} /> },
    { id: "ST-02-24", screen: <ClassDetailsScreen locale={locale} state="finished" texts={texts} /> },
    { id: "ST-02-25", screen: <ClassDetailsScreen locale={locale} state="classCancelled" texts={texts} /> },
    { id: "ST-02-26", screen: <ClassDetailsScreen locale={locale} state="noInstructor" texts={texts} /> },
    { id: "ST-02-27", screen: <ClassDetailsScreen locale={locale} state="loading" texts={texts} /> },
    { id: "ST-02-28", screen: <ClassDetailsScreen locale={locale} state="notFound" texts={texts} /> },
    { id: "ST-02-29", screen: <ClassDetailsScreen locale={locale} state="error" texts={texts} /> },
    { id: "ST-02-30", screen: <ClassDetailsScreen locale={locale} state="open" toast={{ key: "enrolment.errors.ruleNotAccepted", tone: "error" }} texts={texts} /> },
  ] as const;

  return (
    <DesignSection number="02" title={text.sections.class.title} description={text.sections.class.description}>
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
