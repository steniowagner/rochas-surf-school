import type { AdminClassDetailsState, AdminScenario, ClassDetailsState, ClassDetailsView, EnrolmentCta, InstructorClassDetailsState, InstructorScenario, LoadedClassDetails, Scenario } from "./class-details-screen.types";

const CTAS = {
  request: { key: "request", variant: "primary" },
  joinWaitingList: { key: "joinWaitingList", variant: "primary" },
  requestAgain: { key: "requestAgain", variant: "primary" },
  withdraw: { key: "withdraw", variant: "outline" },
  cancelSeat: { key: "cancelSeat", variant: "outline" },
  leaveWaitingList: { key: "leaveWaitingList", variant: "ghost" },
} as const satisfies Record<string, EnrolmentCta>;

/**
 * The one button of the student's footer on a class that hasn't started, with the rules of the app's `getEnrolmentCta`:
 * a request (the waiting list when the class is full) without an enrolment or after an ended one; a withdrawal for a
 * pending request (leaving the waiting list when full); the cancellation of an approved seat only before the deadline.
 */
export const getEnrolmentCta = (status: Scenario["status"], full: boolean, canCancel: boolean, waitingListEnabled: boolean): EnrolmentCta | null => {
  const closed = full && !waitingListEnabled;

  switch (status) {
    case null:
      return closed ? null : full ? CTAS.joinWaitingList : CTAS.request;
    case "pending":
    case "waitingList":
      return full ? CTAS.leaveWaitingList : CTAS.withdraw;
    case "withdrawn":
    case "expired":
    case "denied":
    case "cancelled":
    case "takenOut":
      return closed ? null : CTAS.requestAgain;
    case "approved":
      return canCancel ? CTAS.cancelSeat : null;
    default:
      return null;
  }
};

const base = { status: null, full: false, canCancel: false, waitingListEnabled: true, deadline: "ahead", classState: "not-started" } as const;

/** What each state of the class details is made of. */
export const scenarios: Record<Exclude<ClassDetailsState, "loading" | "notFound" | "error">, Scenario> = {
  open: base,
  pending: { ...base, status: "pending" },
  fullWaitingList: { ...base, full: true },
  waitingList: { ...base, full: true, status: "pending" },
  fullClosed: { ...base, full: true, waitingListEnabled: false },
  approved: { ...base, status: "approved", canCancel: true, inClass: true },
  approvedPassed: { ...base, status: "approved", deadline: "passed", inClass: true },
  approvedNoDeadline: { ...base, status: "approved", deadline: "none", inClass: true },
  denied: { ...base, status: "denied" },
  withdrawn: { ...base, status: "withdrawn" },
  cancelled: { ...base, status: "cancelled" },
  expired: { ...base, status: "expired" },
  takenOut: { ...base, status: "takenOut" },
  started: { ...base, classState: "started" },
  finished: { ...base, classState: "finished" },
  classCancelled: { ...base, classState: "cancelled" },
  noInstructor: { ...base, noInstructor: true },
};

const teaches = { classState: "not-started", teacher: "viewer" } as const;

/** What each state of the instructor's class details is made of. */
export const instructorScenarios: Record<Exclude<InstructorClassDetailsState, "loading" | "notFound" | "error">, InstructorScenario> = {
  teaches: { ...teaches, expanded: true },
  notAssigned: { ...teaches, teacher: "other" },
  noInstructor: { ...teaches, teacher: "none" },
  full: { ...teaches, full: true },
  guests: { ...teaches, guests: true, expanded: true },
  noStudents: { ...teaches, noStudents: true },
  started: { ...teaches, classState: "started" },
  finished: { ...teaches, classState: "finished" },
  classCancelled: { ...teaches, classState: "cancelled" },
};

const adminOpen = { classState: "not-started", teacher: "other" } as const;

/** What each state of the admin's class details is made of. */
export const adminScenarios: Record<Exclude<AdminClassDetailsState, "loading" | "notFound" | "error">, AdminScenario> = {
  open: adminOpen,
  noInstructor: { ...adminOpen, teacher: "none" },
  noDeadline: { ...adminOpen, noDeadline: true },
  full: { ...adminOpen, full: true },
  noStudents: { ...adminOpen, noStudents: true },
  started: { ...adminOpen, classState: "started" },
  finished: { ...adminOpen, classState: "finished" },
  classCancelled: { ...adminOpen, classState: "cancelled" },
  takenOut: { ...adminOpen, takenOut: true },
};

/** The admin's fields, off for the student and the instructor. */
const notAdmin = { showTools: false, showNoInstructor: false, showNoDeadline: false, canTakeOut: false, showTrialCount: false, takenOut: false } as const;

/** What a loaded class's details draw: the student's scenario with their enrolment, the instructor's read-only one, or the admin's with the tools. */
export const getClassDetailsView = (details: LoadedClassDetails): ClassDetailsView => {
  if (details.role === "admin") {
    const scenario = adminScenarios[details.state];
    const notStarted = scenario.classState === "not-started";
    const full = scenario.full ?? false;

    return {
      classState: scenario.classState,
      full,
      deadline: scenario.noDeadline ? "none" : "ahead",
      bannerStatus: null,
      showFullBanner: notStarted && full,
      // The school's waiting list is on in the mock: new requests wait (`classDetails.full.waitingListOff` is in the note).
      fullBannerAdminLine: "newRequestsWait",
      cta: null,
      deadlineNote: null,
      teacher: scenario.teacher,
      inClass: true,
      // The trial guests sit in the classes that still have room.
      guests: !full && !scenario.noStudents,
      noStudents: scenario.noStudents ?? false,
      // The admin's list is open on a class still to happen or under way (with the "Retirar" buttons before it starts).
      expanded: !scenario.noStudents && (notStarted || scenario.classState === "started"),
      readOnlyNoteKey: null,
      showTools: scenario.classState !== "finished" && scenario.classState !== "cancelled",
      showNoInstructor: notStarted && scenario.teacher === "none",
      showNoDeadline: notStarted && (scenario.noDeadline ?? false),
      canTakeOut: notStarted,
      showTrialCount: true,
      takenOut: scenario.takenOut ?? false,
    };
  }

  if (details.role === "instructor") {
    const scenario = instructorScenarios[details.state];

    return {
      classState: scenario.classState,
      full: scenario.full ?? false,
      deadline: "ahead",
      bannerStatus: null,
      showFullBanner: scenario.classState === "not-started" && scenario.full === true,
      cta: null,
      deadlineNote: null,
      teacher: scenario.teacher,
      inClass: true,
      guests: scenario.guests ?? false,
      noStudents: scenario.noStudents ?? false,
      expanded: scenario.expanded ?? false,
      readOnlyNoteKey: scenario.teacher === "viewer" ? "classDetails.readOnly.teaches" : "classDetails.readOnly.notAssigned",
      ...notAdmin,
    };
  }

  const scenario = scenarios[details.state];
  const notStarted = scenario.classState === "not-started";

  return {
    classState: scenario.classState,
    full: scenario.full,
    deadline: scenario.deadline,
    bannerStatus: scenario.status === "pending" && scenario.full ? "waitingList" : scenario.status,
    showFullBanner: notStarted && scenario.full && scenario.status === null,
    fullBannerWaitingList: scenario.waitingListEnabled ? "open" : "closed",
    cta: notStarted ? getEnrolmentCta(scenario.status, scenario.full, scenario.canCancel, scenario.waitingListEnabled) : null,
    deadlineNote: notStarted && scenario.status === "approved" && !scenario.canCancel ? (scenario.deadline === "none" ? "missing" : "passed") : null,
    teacher: scenario.noInstructor ? "none" : "other",
    inClass: scenario.inClass ?? false,
    guests: false,
    noStudents: false,
    expanded: false,
    readOnlyNoteKey: null,
    ...notAdmin,
  };
};
