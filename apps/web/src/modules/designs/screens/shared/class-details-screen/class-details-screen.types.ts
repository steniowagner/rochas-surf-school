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

/** The admin's class details (spec 075, the app's `canEdit`): the tools, the take-out and the admin's banners. */
export type AdminClassDetailsState =
  | "open"
  | "noInstructor"
  | "noDeadline"
  | "full"
  | "noStudents"
  | "started"
  | "finished"
  | "classCancelled"
  | "takenOut"
  | "loading"
  | "notFound"
  | "error";

/** The admin's sheets: the class tools, cancelling, deleting (or why it can't be), taking a student or a guest out, and a student's person sheet. */
export type AdminClassDetailsSheet = "tools" | "cancel" | "delete" | "deleteNotEmpty" | "takeOut" | "takeOutGuest" | "person";

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
  toast?: ClassDetailsToast;
  /** The denial sheet without the school's reason. */
  withoutReason?: boolean;
};

type InstructorClassDetailsProps = {
  /** Read-only: the note of `readOnlyNoteKey`, no enrolment, no footer and no tools (D-01). */
  role: "instructor";
  state: InstructorClassDetailsState;
  sheet?: InstructorClassDetailsSheet;
};

type AdminClassDetailsProps = {
  /** The app's `canEdit`: the tools, the take-out, the no-instructor and no-deadline banners; no enrolment or footer (D-01). */
  role: "admin";
  state: AdminClassDetailsState;
  sheet?: AdminClassDetailsSheet;
  toast?: ClassDetailsToast;
};

/** A toast over the top: the app message's key and its values. */
export type ClassDetailsToast = { key: string; tone: "success" | "error"; params?: Record<string, string | number> };

export type ClassDetailsScreenProps = { locale: Locale } & ClassDetailsTexts & (StudentClassDetailsProps | InstructorClassDetailsProps | AdminClassDetailsProps);

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

/** What each state of the admin's class details is made of. */
export type AdminScenario = {
  classState: Scenario["classState"];
  /** Who teaches it: another instructor, or nobody. */
  teacher: "other" | "none";
  full?: boolean;
  noStudents?: boolean;
  /** Its cancellation deadline couldn't be worked out. */
  noDeadline?: boolean;
  /** A student was just taken out of it. */
  takenOut?: boolean;
};

type LoadState = "loading" | "notFound" | "error";

/** A loaded class's state, in the student's, the instructor's or the admin's form. */
export type LoadedClassDetails =
  | { role?: "student"; state: Exclude<ClassDetailsState, LoadState> }
  | { role: "instructor"; state: Exclude<InstructorClassDetailsState, LoadState> }
  | { role: "admin"; state: Exclude<AdminClassDetailsState, LoadState> };

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
  /** The admin's: the tools header button, while the class can change (the app's `showTools`). */
  showTools: boolean;
  /** The admin's banners of a class that hasn't started: nobody teaches it, or its deadline couldn't be worked out. */
  showNoInstructor: boolean;
  showNoDeadline: boolean;
  /** The admin's line in the full banner. */
  fullBannerAdminLine?: "newRequestsWait";
  /** The admin's "Retirar" on the students and guests of a class that hasn't started, and the trial count. */
  canTakeOut: boolean;
  showTrialCount: boolean;
  /** The student just taken out isn't among the people any more. */
  takenOut: boolean;
};
