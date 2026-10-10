import { USER_ROLES } from "@rochas-surf-school/auth";

import { routes } from "@/constants/routes";

import { flowEntryRoute, resolveFlow } from "./resolve-flow";
import { Flow, SessionUser } from "./resolve-flow.types";

const userWith = (status: string, role: string): SessionUser => ({
  id: "user-1",
  name: "Ana Silva",
  email: "ana.silva@gmail.com",
  createdAt: "2026-10-10T12:00:00.000Z",
  role,
  status,
});

const byRole = USER_ROLES.flatMap((role) => [
  {
    state: `pending ${role}`,
    status: "pending",
    role,
    onboardingCompleted: true,
    flow: "onboarding",
  },
  {
    state: `pending ${role} without onboarding`,
    status: "pending",
    role,
    onboardingCompleted: false,
    flow: "onboarding",
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

describe("flowEntryRoute", () => {
  it.each<[Flow, string]>([
    ["auth", routes.auth.signIn],
    ["onboarding", routes.onboarding.home],
    ["reactivation", routes.reactivation.home],
    ["offboarding-denied", routes.offboarding.denied],
    ["offboarding-removed", routes.offboarding.removed],
    ["student", routes.student.home],
    ["instructor", routes.instructor.home],
    ["admin", routes.admin.home],
  ])("returns the entry route of %s", (flow, route) => {
    expect(flowEntryRoute(flow)).toBe(route);
  });

  it("uses the paths of D-10", () => {
    expect(
      (
        [
          "auth",
          "onboarding",
          "reactivation",
          "offboarding-denied",
          "offboarding-removed",
          "student",
          "instructor",
          "admin",
        ] as Flow[]
      ).map(flowEntryRoute),
    ).toEqual([
      "/auth",
      "/onboarding",
      "/reactivation",
      "/offboarding/denied",
      "/offboarding/removed",
      "/student",
      "/instructor",
      "/admin",
    ]);
  });
});
