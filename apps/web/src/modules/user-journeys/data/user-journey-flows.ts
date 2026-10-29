import type { AdminAppEntryId } from "@/modules/designs/data/admin-app-ids";
import type { AuthFlowEntryId } from "@/modules/designs/data/auth-flow-ids";
import type { InstructorAppEntryId } from "@/modules/designs/data/instructor-app-ids";
import type { StudentAppEntryId } from "@/modules/designs/data/student-app-ids";

/** A design frame a row links to: an id of the auth flow, student, instructor or admin design page. */
export type JourneyDesignId = AuthFlowEntryId | StudentAppEntryId | InstructorAppEntryId | AdminAppEntryId;

type FlowStructure = {
  /** The design page the flow's "See the designs" opens. */
  designPage: "auth-flow" | "student-app" | "instructor-app" | "admin-app";
  groups: readonly {
    key: string;
    rows: readonly { id: string; designIds: readonly JourneyDesignId[] }[];
  }[];
};

/**
 * The locale-free structure of the four user journey flows (spec 076, D-13), exactly as in the spec's journeys.md:
 * per flow its design page, its groups in order and their rows, with the design frames each row links to. The texts
 * are in `../i18n/{en,pt-br,es}.ts`.
 */
export const userJourneyFlows = {
  auth: {
    designPage: "auth-flow",
    groups: [
      {
        key: "signIn",
        rows: [
          { id: "AU-01", designIds: ["AF-01-01", "AF-01-02"] },
          { id: "AU-02", designIds: ["AF-01-03", "AF-02-15", "AF-03-01"] },
          { id: "AU-03", designIds: ["AF-01-01"] },
        ],
      },
      {
        key: "email",
        rows: [
          { id: "AU-04", designIds: ["AF-02-01", "AF-02-06", "AF-02-07", "AF-02-10"] },
          { id: "AU-05", designIds: ["AF-02-13", "AF-03-01"] },
          { id: "AU-06", designIds: ["AF-02-12"] },
          { id: "AU-07", designIds: ["AF-02-10", "AF-02-11"] },
          { id: "AU-08", designIds: ["AF-02-02", "AF-02-10"] },
          { id: "AU-09", designIds: ["AF-02-02", "AF-02-06"] },
        ],
      },
      {
        key: "approval",
        rows: [
          { id: "AU-10", designIds: ["AF-03-01"] },
          { id: "AU-11", designIds: ["AF-03-02"] },
          { id: "AU-12", designIds: ["AF-03-02", "AF-03-03", "AF-03-04", "AF-03-05"] },
          { id: "AU-13", designIds: ["AF-03-09", "AF-03-10"] },
          { id: "AU-14", designIds: ["AF-03-14"] },
          { id: "AU-15", designIds: [] },
        ],
      },
      {
        key: "closedAccount",
        rows: [
          { id: "AU-16", designIds: ["AF-04-07", "AF-04-08"] },
          { id: "AU-17", designIds: ["ST-05-07", "AF-04-01", "AF-04-04"] },
          { id: "AU-18", designIds: ["AF-04-05", "AF-04-06"] },
          { id: "AU-19", designIds: ["AF-04-10"] },
        ],
      },
    ],
  },
  student: {
    designPage: "student-app",
    groups: [
      {
        key: "schedule",
        rows: [
          { id: "ST-01", designIds: ["ST-01-01"] },
          { id: "ST-02", designIds: ["ST-01-01", "ST-01-02"] },
          { id: "ST-03", designIds: ["ST-01-03", "ST-01-04"] },
          { id: "ST-04", designIds: ["ST-01-06"] },
          { id: "ST-05", designIds: ["ST-02-01"] },
        ],
      },
      {
        key: "requestSeat",
        rows: [
          { id: "ST-06", designIds: ["ST-02-02", "ST-02-05", "ST-02-06"] },
          { id: "ST-07", designIds: ["ST-02-07", "ST-02-19"] },
          { id: "ST-08", designIds: ["ST-02-08", "ST-02-09", "ST-02-10"] },
          { id: "ST-09", designIds: ["ST-02-11"] },
          { id: "ST-10", designIds: ["ST-02-12"] },
          { id: "ST-11", designIds: ["ST-02-17", "ST-02-18"] },
          { id: "ST-12", designIds: ["ST-02-13", "ST-02-14"] },
          { id: "ST-13", designIds: ["ST-02-15"] },
          { id: "ST-14", designIds: ["ST-02-12", "ST-02-22"] },
          { id: "ST-15", designIds: ["ST-02-25"] },
          { id: "ST-16", designIds: ["ST-06-01"] },
          { id: "ST-17", designIds: ["ST-02-23", "ST-02-24"] },
        ],
      },
      {
        key: "bookings",
        rows: [
          { id: "ST-18", designIds: ["ST-03-01", "ST-03-02", "ST-03-03", "ST-03-04", "ST-03-07"] },
          { id: "ST-19", designIds: ["ST-03-10", "ST-03-11"] },
        ],
      },
      {
        key: "people",
        rows: [
          { id: "ST-20", designIds: ["ST-04-01", "ST-04-02", "ST-04-03"] },
          { id: "ST-21", designIds: ["ST-04-06", "ST-04-07"] },
        ],
      },
      {
        key: "profile",
        rows: [
          { id: "ST-22", designIds: ["ST-05-13", "ST-05-14"] },
          { id: "ST-23", designIds: ["ST-05-16", "ST-05-17"] },
          { id: "ST-24", designIds: ["ST-05-03", "ST-05-04"] },
          { id: "ST-25", designIds: ["ST-05-01", "ST-05-02"] },
          { id: "ST-26", designIds: ["ST-05-09", "ST-05-19"] },
          { id: "ST-27", designIds: ["ST-05-06"] },
        ],
      },
      {
        key: "notifications",
        rows: [
          { id: "ST-28", designIds: ["ST-06-01"] },
        ],
      },
    ],
  },
  instructor: {
    designPage: "instructor-app",
    groups: [
      {
        key: "home",
        rows: [
          { id: "IN-01", designIds: ["IN-01-01", "IN-01-02"] },
        ],
      },
      {
        key: "classes",
        rows: [
          { id: "IN-02", designIds: ["IN-02-01", "IN-02-02", "IN-02-03", "IN-02-04"] },
        ],
      },
      {
        key: "aClass",
        rows: [
          { id: "IN-03", designIds: ["IN-03-01", "IN-03-05"] },
          { id: "IN-04", designIds: ["IN-03-02"] },
          { id: "IN-05", designIds: ["IN-03-10"] },
        ],
      },
      {
        key: "myClasses",
        rows: [
          { id: "IN-06", designIds: ["IN-04-01", "IN-04-02", "IN-04-03"] },
          { id: "IN-07", designIds: ["IN-04-08", "IN-04-09"] },
          { id: "IN-08", designIds: ["IN-05-01", "IN-05-02", "IN-05-03"] },
        ],
      },
      {
        key: "classNotifications",
        rows: [
          { id: "IN-09", designIds: ["IN-06-06"] },
          { id: "IN-10", designIds: ["IN-06-06"] },
          { id: "IN-11", designIds: ["IN-06-06"] },
          { id: "IN-12", designIds: ["IN-06-06"] },
          { id: "IN-13", designIds: ["IN-06-06"] },
        ],
      },
      {
        key: "peopleAndProfile",
        rows: [
          { id: "IN-14", designIds: ["IN-06-01"] },
          { id: "IN-15", designIds: ["IN-06-02", "IN-06-03", "IN-06-04", "IN-06-05"] },
          { id: "IN-16", designIds: ["IN-06-06"] },
        ],
      },
    ],
  },
  admin: {
    designPage: "admin-app",
    groups: [
      {
        key: "home",
        rows: [
          { id: "AD-01", designIds: ["AD-01-01", "AD-01-02"] },
        ],
      },
      {
        key: "accounts",
        rows: [
          { id: "AD-02", designIds: ["AD-07-01", "AD-07-03"] },
          { id: "AD-03", designIds: ["AD-07-02"] },
          { id: "AD-04", designIds: ["AD-07-07", "AD-07-08"] },
          { id: "AD-05", designIds: ["AD-09-06", "AD-07-12"] },
        ],
      },
      {
        key: "classes",
        rows: [
          { id: "AD-06", designIds: ["AD-02-01", "AD-02-05", "AD-02-06"] },
          { id: "AD-07", designIds: ["AD-04-01", "AD-04-02", "AD-04-06"] },
          { id: "AD-08", designIds: ["AD-04-03"] },
          { id: "AD-09", designIds: ["AD-04-07", "AD-04-08", "AD-04-10"] },
          { id: "AD-10", designIds: ["AD-04-04", "AD-04-05", "AD-04-09"] },
          { id: "AD-11", designIds: ["AD-03-09", "AD-04-11", "AD-04-12"] },
          { id: "AD-12", designIds: ["AD-03-11", "AD-03-08"] },
          { id: "AD-13", designIds: ["AD-03-12", "AD-03-10", "AD-03-09"] },
          { id: "AD-14", designIds: ["AD-03-02", "AD-03-03"] },
        ],
      },
      {
        key: "messages",
        rows: [
          { id: "AD-15", designIds: ["AD-05-01", "AD-05-02", "AD-05-03", "AD-05-04"] },
          { id: "AD-16", designIds: ["AD-05-05", "AD-05-06"] },
        ],
      },
      {
        key: "enrolments",
        rows: [
          { id: "AD-17", designIds: ["AD-06-01", "AD-06-05"] },
          { id: "AD-18", designIds: ["AD-06-04"] },
          { id: "AD-19", designIds: ["AD-06-02"] },
          { id: "AD-20", designIds: ["AD-08-01", "AD-08-02", "AD-08-06", "AD-08-09"] },
          { id: "AD-21", designIds: ["AD-08-05", "AD-03-01"] },
          { id: "AD-22", designIds: ["AD-03-14", "AD-03-15", "AD-03-17"] },
          { id: "AD-23", designIds: ["AD-11-08"] },
        ],
      },
      {
        key: "peopleAndRoles",
        rows: [
          { id: "AD-24", designIds: ["AD-09-01", "AD-09-02"] },
          { id: "AD-25", designIds: ["AD-09-02", "AD-09-03", "AD-09-05"] },
          { id: "AD-26", designIds: ["AD-09-04"] },
        ],
      },
      {
        key: "school",
        rows: [
          { id: "AD-27", designIds: ["AD-11-03"] },
          { id: "AD-28", designIds: ["AD-10-01", "AD-10-02"] },
          { id: "AD-29", designIds: ["AD-10-05", "AD-10-06"] },
          { id: "AD-30", designIds: ["AD-10-09", "AD-10-10", "AD-10-11", "AD-10-12"] },
        ],
      },
      {
        key: "teaching",
        rows: [
          { id: "AD-31", designIds: ["AD-11-01", "AD-11-02"] },
          { id: "AD-32", designIds: ["AD-11-04", "AD-11-05", "AD-11-06", "AD-11-07"] },
          { id: "AD-33", designIds: ["AD-11-08"] },
        ],
      },
    ],
  },
} as const satisfies Record<string, FlowStructure>;

export type UserJourneyFlowSlug = keyof typeof userJourneyFlows;

/** The flows in the order the index lists them. */
export const userJourneyFlowSlugs = ["auth", "student", "instructor", "admin"] as const satisfies readonly UserJourneyFlowSlug[];

export type UserJourneyGroupKey<F extends UserJourneyFlowSlug> = (typeof userJourneyFlows)[F]["groups"][number]["key"];

export type UserJourneyRowId<F extends UserJourneyFlowSlug = UserJourneyFlowSlug> =
  F extends UserJourneyFlowSlug ? (typeof userJourneyFlows)[F]["groups"][number]["rows"][number]["id"] : never;

/** Any row id of any flow (`AU-NN`, `ST-NN`, `IN-NN`, `AD-NN`). */
export type RowId = UserJourneyRowId;

export const isUserJourneyFlowSlug = (value: string): value is UserJourneyFlowSlug =>
  (userJourneyFlowSlugs as readonly string[]).includes(value);

export type UserJourneyRow = { id: RowId; designIds: readonly JourneyDesignId[] };

/** Every row of a flow, in order, across its groups. */
export const flowRows = (flow: UserJourneyFlowSlug): readonly UserJourneyRow[] => {
  const groups: FlowStructure["groups"] = userJourneyFlows[flow].groups;
  return groups.flatMap((group) => group.rows) as readonly UserJourneyRow[];
};
