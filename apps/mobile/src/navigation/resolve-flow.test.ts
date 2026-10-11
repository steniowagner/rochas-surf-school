import { USER_ROLES } from "@rochas-surf-school/auth";

import { routes } from "@/constants/routes";

import {
  flowEntryRoute,
  isOnboardingCompleted,
  onboardingStep,
  resolveFlow,
} from "./resolve-flow";
import { Flow, SessionUser } from "./resolve-flow.types";

const userWith = (status: string, role: string): SessionUser => ({
  id: "user-1",
  name: "Ana Silva",
  email: "ana.silva@gmail.com",
  createdAt: "2026-10-10T12:00:00.000Z",
  whatsappNumber: null,
  whatsappVisible: false,
  rulesAccepted: false,
  rulesAcceptedBefore: false,
  role,
  status,
});

const byRole = USER_ROLES.flatMap((role) => [
  {
    state: `pending ${role}`,
    status: "pending",
    role,
    onboardingCompleted: true,
    flow: "pending",
  },
  {
    state: `pending ${role} without onboarding`,
    status: "pending",
    role,
    onboardingCompleted: false,
    flow: "pending",
  },
  {
    state: `approved ${role} without onboarding`,
    status: "approved",
    role,
    onboardingCompleted: false,
    flow: "onboarding",
  },
  {
    state: `approved ${role} with onboarding`,
    status: "approved",
    role,
    onboardingCompleted: true,
    flow: role,
  },
  {
    state: `deleted ${role}`,
    status: "deleted",
    role,
    onboardingCompleted: true,
    flow: "reactivation",
  },
  {
    state: `denied ${role}`,
    status: "denied",
    role,
    onboardingCompleted: true,
    flow: "offboarding-denied",
  },
  {
    state: `removed ${role}`,
    status: "removed",
    role,
    onboardingCompleted: true,
    flow: "offboarding-removed",
  },
]);

describe("resolveFlow", () => {
  it("resolves no user to auth", () => {
    expect(resolveFlow({ user: null, onboardingCompleted: true })).toBe("auth");
  });

  it.each(byRole)(
    "resolves $state to $flow",
    ({ status, role, onboardingCompleted, flow }) => {
      expect(
        resolveFlow({ user: userWith(status, role), onboardingCompleted }),
      ).toBe(flow);
    },
  );

  it.each([
    { state: "an unknown status", status: "archived", role: "student" },
    { state: "an approved unknown role", status: "approved", role: "owner" },
  ])("resolves $state to auth", ({ status, role }) => {
    expect(
      resolveFlow({ user: userWith(status, role), onboardingCompleted: true }),
    ).toBe("auth");
  });
});

describe("rules update", () => {
  const flowOf = (user: SessionUser) =>
    resolveFlow({ user, onboardingCompleted: isOnboardingCompleted(user) });

  const approved = (
    role: string,
    {
      number = "+5585999998888" as string | null,
      accepted = false,
      before = false,
    } = {},
  ): SessionUser => ({
    ...userWith("approved", role),
    whatsappNumber: number,
    rulesAccepted: accepted,
    rulesAcceptedBefore: before,
  });

  it.each(USER_ROLES)(
    "resolves a %s that accepted before and missed a change to rules-update",
    (role) => {
      expect(flowOf(approved(role, { before: true }))).toBe("rules-update");
    },
  );

  it.each(USER_ROLES)(
    "keeps the onboarding step for a first acceptance of a %s",
    (role) => {
      expect(flowOf(approved(role))).toBe("onboarding");
    },
  );

  it.each(USER_ROLES)(
    "opens the %s home once the rules are accepted",
    (role) => {
      expect(flowOf(approved(role, { accepted: true, before: true }))).toBe(
        role,
      );
    },
  );

  it.each([true, false])(
    "keeps the WhatsApp step without a number (accepted before: %s)",
    (before) => {
      const user = approved("student", { number: null, before });

      expect(flowOf(user)).toBe("onboarding");
      expect(onboardingStep(user)).toBe("whatsapp");
    },
  );

  it.each(["pending", "deleted", "denied", "removed"])(
    "keeps the %s flow whatever the flags are",
    (status) => {
      const user = { ...approved("student", { before: true }), status };

      expect(flowOf(user)).not.toBe("rules-update");
    },
  );

  it("still falls back to auth for an unknown role with the rules accepted", () => {
    expect(flowOf(approved("owner", { accepted: true, before: true }))).toBe(
      "auth",
    );
  });
});

describe("onboarding completed", () => {
  const student = userWith("approved", "student");

  it.each([
    {
      state: "a number and the rules accepted",
      number: "+5585999998888",
      accepted: true,
      expected: true,
    },
    {
      state: "a number and the rules not accepted",
      number: "+5585999998888",
      accepted: false,
      expected: false,
    },
    {
      state: "no number and the rules accepted",
      number: null,
      accepted: true,
      expected: false,
    },
  ])("is $expected with $state", ({ number, accepted, expected }) => {
    expect(
      isOnboardingCompleted({
        ...student,
        whatsappNumber: number,
        rulesAccepted: accepted,
      }),
    ).toBe(expected);
  });

  it("is false without a user", () => {
    expect(isOnboardingCompleted(null)).toBe(false);
  });
});

describe("onboardingStep", () => {
  it("is whatsapp while the account has no number", () => {
    expect(onboardingStep(userWith("approved", "student"))).toBe("whatsapp");
    expect(onboardingStep(null)).toBe("whatsapp");
  });

  it("is school-rules once the account has a number", () => {
    const user = {
      ...userWith("approved", "student"),
      whatsappNumber: "+5585999998888",
    };

    expect(onboardingStep(user)).toBe("school-rules");
  });
});

describe("flowEntryRoute", () => {
  const student = userWith("approved", "student");

  it.each<[Exclude<Flow, "onboarding">, string]>([
    ["auth", routes.auth.signIn],
    ["rules-update", routes.rulesUpdate.home],
    ["pending", routes.pending.home],
    ["reactivation", routes.reactivation.home],
    ["offboarding-denied", routes.offboarding.denied],
    ["offboarding-removed", routes.offboarding.removed],
    ["student", routes.student.home],
    ["instructor", routes.instructor.home],
    ["admin", routes.admin.home],
  ])("returns the entry route of %s", (flow, route) => {
    expect(flowEntryRoute(flow, student)).toBe(route);
  });

  it("opens onboarding on the WhatsApp step without a number", () => {
    expect(flowEntryRoute("onboarding", student)).toBe(
      routes.onboarding.whatsapp,
    );
  });

  it("opens onboarding on school rules with a number", () => {
    const withNumber = { ...student, whatsappNumber: "+5585999998888" };

    expect(flowEntryRoute("onboarding", withNumber)).toBe(
      routes.onboarding.schoolRules,
    );
  });

  it("uses the paths of D-10 and D-05", () => {
    const withNumber = { ...student, whatsappNumber: "+5585999998888" };

    expect(
      (
        [
          "auth",
          "pending",
          "onboarding",
          "reactivation",
          "offboarding-denied",
          "offboarding-removed",
          "student",
          "instructor",
          "admin",
        ] as Flow[]
      ).map((flow) => flowEntryRoute(flow, student)),
    ).toEqual([
      "/auth",
      "/pending",
      "/onboarding",
      "/reactivation",
      "/offboarding/denied",
      "/offboarding/removed",
      "/student",
      "/instructor",
      "/admin",
    ]);
    expect(flowEntryRoute("onboarding", withNumber)).toBe(
      "/onboarding/school-rules",
    );
  });
});
