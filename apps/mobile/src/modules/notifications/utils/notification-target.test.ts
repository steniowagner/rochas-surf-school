import { routes } from "@/constants/routes";
import type { Flow } from "@/navigation/resolve-flow.types";

import { classDetailTarget, isAdminMessageType, notificationTarget } from "./notification-target";

const ROLES = ["student", "instructor", "admin"] as const;
const OTHER_FLOWS: Flow[] = [
  "auth",
  "pending",
  "onboarding",
  "rules-update",
  "reactivation",
  "offboarding-denied",
  "offboarding-removed",
];

/** Where each type leads, by role, with the class C named; `null` leads nowhere. */
const WITH_CLASS: Record<string, Record<(typeof ROLES)[number], unknown>> = {
  "registration.pending": { student: null, instructor: null, admin: routes.admin.registrations },
  "registration.approved": { student: null, instructor: null, admin: null },
  "registration.denied": { student: null, instructor: null, admin: null },
  "reactivation.requested": { student: null, instructor: null, admin: routes.admin.reactivations },
  "reactivation.approved": { student: null, instructor: null, admin: null },
  "reactivation.denied": { student: null, instructor: null, admin: null },
  "class.assigned": { student: null, instructor: routes.instructor.classes, admin: routes.admin.classes },
  "class.edited": {
    student: routes.student.classDetail("C"),
    instructor: routes.instructor.classDetail("C"),
    admin: routes.admin.classDetail("C"),
  },
  "class.unassigned": {
    student: null,
    instructor: routes.instructor.classDetail("C"),
    admin: routes.admin.classDetail("C"),
  },
  "class.cancelled": {
    student: routes.student.classDetail("C"),
    instructor: routes.instructor.classDetail("C"),
    admin: routes.admin.classDetail("C"),
  },
  "class.deleted": { student: null, instructor: routes.instructor.classes, admin: routes.admin.classes },
  "class.noInstructor": { student: null, instructor: null, admin: routes.admin.classDetail("C") },
  "class.reminder": {
    student: routes.student.classDetail("C"),
    instructor: routes.instructor.classDetail("C"),
    admin: routes.admin.classDetail("C"),
  },
  // Without its notification's id: the push passes it (see below), and a row opens the sheet by itself.
  "class.message": { student: null, instructor: null, admin: null },
  "location.changed": {
    student: routes.student.home,
    instructor: routes.instructor.classes,
    admin: routes.admin.classes,
  },
  "enrolment.requested": {
    student: null,
    instructor: routes.instructor.classDetail("C"),
    admin: routes.admin.classRequests,
  },
  "enrolment.expired": { student: routes.student.classDetail("C"), instructor: null, admin: null },
  "enrolment.approved": { student: routes.student.classDetail("C"), instructor: null, admin: null },
  "enrolment.denied": { student: routes.student.classDetail("C"), instructor: null, admin: null },
  "enrolment.cancelled": {
    student: null,
    instructor: routes.instructor.classDetail("C"),
    admin: routes.admin.classDetail("C"),
  },
  "enrolment.enrolled": { student: routes.student.classDetail("C"), instructor: null, admin: null },
  "enrolment.takenOut": { student: routes.student.classDetail("C"), instructor: null, admin: null },
  // Leads to no screen of its own: the push and the row open the home of the flow the account now resolves to.
  "role.changed": { student: null, instructor: null, admin: null },
  "account.removed": { student: null, instructor: null, admin: null },
  "account.restored": { student: null, instructor: null, admin: null },
};

/** The same without a class id: only the destinations that name no class remain. */
const WITHOUT_CLASS: Record<string, Partial<Record<(typeof ROLES)[number], unknown>>> = {
  "registration.pending": { admin: routes.admin.registrations },
  "reactivation.requested": { admin: routes.admin.reactivations },
  "class.assigned": { instructor: routes.instructor.classes, admin: routes.admin.classes },
  "class.deleted": { instructor: routes.instructor.classes, admin: routes.admin.classes },
  "location.changed": {
    student: routes.student.home,
    instructor: routes.instructor.classes,
    admin: routes.admin.classes,
  },
  "enrolment.requested": { admin: routes.admin.classRequests },
};

const cases = Object.entries(WITH_CLASS).flatMap(([type, byRole]) =>
  ROLES.map((role) => [type, role, byRole[role]] as const),
);

describe("notificationTarget", () => {
  it("covers the 25 notification types", () => {
    expect(Object.keys(WITH_CLASS)).toHaveLength(25);
  });

  it("leads a role.changed nowhere in any flow, so its tap opens the flow's home", () => {
    for (const flow of [...ROLES, ...OTHER_FLOWS]) {
      expect(notificationTarget("role.changed", null, flow)).toBeNull();
    }
  });

  it.each(["account.removed", "account.restored"])(
    "leads a %s nowhere in any flow, so its tap opens the flow's home",
    (type) => {
      for (const flow of [...ROLES, ...OTHER_FLOWS]) {
        expect(notificationTarget(type, null, flow)).toBeNull();
      }
    },
  );

  it("leads a broadcast with no id nowhere in any flow", () => {
    for (const flow of [...ROLES, ...OTHER_FLOWS]) {
      expect(notificationTarget("broadcast", null, flow)).toBeNull();
    }
  });

  it.each(cases)("leads a %s for a %s with a class where its push leads", (type, flow, target) => {
    expect(notificationTarget(type, "C", flow)).toEqual(target);
  });

  it.each(cases)("leads a %s for a %s without a class only where no class is needed", (type, flow) => {
    expect(notificationTarget(type, null, flow)).toEqual(WITHOUT_CLASS[type]?.[flow] ?? null);
  });

  describe.each(["broadcast", "class.message"])("a %s", (type) => {
    it.each(ROLES)("opens Avisos with its message in the %s flow", (role) => {
      expect(notificationTarget(type, "C", role, "N")).toEqual(routes[role].notificationMessage("N"));
    });

    it.each(OTHER_FLOWS)("leads to the flow's home in the %s flow", (flow) => {
      expect(notificationTarget(type, "C", flow, "N")).toBeNull();
    });

    it.each(ROLES)("leads nowhere without an id in the %s flow", (role) => {
      expect(notificationTarget(type, "C", role)).toBeNull();
    });
  });

  it.each(OTHER_FLOWS)("leads nowhere in the %s flow", (flow) => {
    for (const type of Object.keys(WITH_CLASS)) {
      expect(notificationTarget(type, "C", flow)).toBeNull();
    }
  });

  it.each([undefined, "broadcast.sent", 42])("leads nowhere for an unknown type (%p)", (type) => {
    for (const flow of ROLES) {
      expect(notificationTarget(type, "C", flow)).toBeNull();
    }
  });
});

describe("isAdminMessageType", () => {
  it.each(["broadcast", "class.message"])("takes %s", (type) => {
    expect(isAdminMessageType(type)).toBe(true);
  });

  it.each(["class.cancelled", "class.edited", undefined])("leaves out %s", (type) => {
    expect(isAdminMessageType(type)).toBe(false);
  });
});

describe("classDetailTarget", () => {
  it.each(ROLES)("opens the class in the %s flow", (role) => {
    expect(classDetailTarget("C", role)).toEqual(routes[role].classDetail("C"));
  });

  it.each(OTHER_FLOWS)("leads nowhere in the %s flow", (flow) => {
    expect(classDetailTarget("C", flow)).toBeNull();
  });
});
