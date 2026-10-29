import type { Locale } from "@/i18n/locales";

import type { ClassCardEnrolmentKey } from "@/modules/designs/components/class-card/class-card.types";

export type ClassDetailsState =
  | "open"
  | "pending"
  | "fullWaitingList"
  | "waitingList"
  | "fullClosed"
  | "approved"
  | "approvedPassed"
  | "approvedNoDeadline"
  | "denied"
  | "withdrawn"
  | "cancelled"
  | "expired"
  | "takenOut"
  | "started"
  | "finished"
  | "classCancelled"
  | "noInstructor"
  | "loading"
  | "notFound"
  | "error";

export type ClassDetailsSheet = "request" | "requestNoDeadline" | "requestNoRule" | "requestSending" | "requestWaitingList" | "withdraw" | "cancelSeat" | "denial";

/** The instructor's read-only class details (spec 074): theirs or another instructor's, and the class's states. */
export type InstructorClassDetailsState =
  | "teaches"
  | "notAssigned"
  | "noInstructor"
  | "full"
  | "guests"
  | "noStudents"
  | "started"
  | "finished"
  | "classCancelled"
  | "loading"
  | "notFound"
  | "error";

/** The instructor's sheets: a student's person sheet, and the cancellation rules from "Ler a regra". */
export type InstructorClassDetailsSheet = "person" | "rules";

type ClassDetailsTexts = {
  /** Texts the school typed (spec 073 D-04): not app copy. */
  texts: { notes: string; denialReason?: string; takeOutReason?: string; cancellationRules?: { surf: string; skate: string } };
};

type StudentClassDetailsProps = {
  role?: "student";
  state: ClassDetailsState;
  /** A sheet open over the screen. */
  sheet?: ClassDetailsSheet;
  /** A toast over the top: the app message's key. */
  toast?: { key: string; tone: "success" | "error" };
  /** The denial sheet without the school's reason. */
  withoutReason?: boolean;
};

type InstructorClassDetailsProps = {
  /** Read-only: the note of `readOnlyNoteKey`, no enrolment, no footer and no tools (D-01). */
  role: "instructor";
  state: InstructorClassDetailsState;
  sheet?: InstructorClassDetailsSheet;
};

export type ClassDetailsScreenProps = { locale: Locale } & ClassDetailsTexts & (StudentClassDetailsProps | InstructorClassDetailsProps);

export type EnrolmentCtaKey = "request" | "joinWaitingList" | "withdraw" | "leaveWaitingList" | "requestAgain" | "cancelSeat";

export type EnrolmentCta = { key: EnrolmentCtaKey; variant: "primary" | "outline" | "ghost" };

export type Scenario = {
  status: ClassCardEnrolmentKey | null;
  full: boolean;
  canCancel: boolean;
  waitingListEnabled: boolean;
  deadline: "ahead" | "passed" | "none";
  classState: "not-started" | "started" | "finished" | "cancelled";
  noInstructor?: boolean;
  /** The student holds a seat: they are among the people of the class. */
  inClass?: boolean;
};

export type InstructorScenario = {
  classState: Scenario["classState"];
  /** Who teaches it: the viewer ("Você"), another instructor, or nobody. */
  teacher: "viewer" | "other" | "none";
  full?: boolean;
  /** With the trial guests of the mock. */
  guests?: boolean;
  /** Nobody has a seat yet. */
  noStudents?: boolean;
  /** The list of the people opened under the avatars. */
  expanded?: boolean;
};

type LoadState = "loading" | "notFound" | "error";

/** A loaded class's state, in the student's or the instructor's form. */
export type LoadedClassDetails = { role?: "student"; state: Exclude<ClassDetailsState, LoadState> } | { role: "instructor"; state: Exclude<InstructorClassDetailsState, LoadState> };

/** What the details of a loaded class draw. */
export type ClassDetailsView = {
  classState: Scenario["classState"];
  full: boolean;
  /** The deadline the rules card shows. */
  deadline: Scenario["deadline"];
  /** The banner of the viewer's own enrolment. */
  bannerStatus: Scenario["status"];
  showFullBanner: boolean;
  /** What the full banner adds under its title; nothing for the instructor. */
  fullBannerWaitingList?: "open" | "closed";
  cta: EnrolmentCta | null;
  /** The note under the footer of an approved seat that can't be cancelled any more. */
  deadlineNote: "missing" | "passed" | null;
  teacher: InstructorScenario["teacher"];
  /** The people drawn are the ones with the viewer's seat. */
  inClass: boolean;
  guests: boolean;
  noStudents: boolean;
  expanded: boolean;
  /** The instructor's note: whether the class is theirs (the app's `readOnlyNoteKey`). */
  readOnlyNoteKey: "classDetails.readOnly.teaches" | "classDetails.readOnly.notAssigned" | null;
};
