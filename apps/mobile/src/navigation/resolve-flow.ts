import { USER_ROLES, USER_STATUSES } from "@rochas-surf-school/auth";
import type { UserRole, UserStatus } from "@rochas-surf-school/auth";

import { routes } from "@/constants/routes";

import { Flow, FlowEntryRoutes, ResolveFlowInput } from "./resolve-flow.types";

const isUserRole = (role: string): role is UserRole =>
  (USER_ROLES as readonly string[]).includes(role);

const isUserStatus = (status: string): status is UserStatus =>
  (USER_STATUSES as readonly string[]).includes(status);

const FLOW_BY_INACTIVE_STATUS: Record<Exclude<UserStatus, "approved">, Flow> = {
  pending: "onboarding",
  deleted: "reactivation",
  denied: "offboarding-denied",
  removed: "offboarding-removed",
};

const FLOW_ENTRY_ROUTES: FlowEntryRoutes = {
  auth: routes.auth.signIn,
  onboarding: routes.onboarding.home,
  reactivation: routes.reactivation.home,
  "offboarding-denied": routes.offboarding.denied,
  "offboarding-removed": routes.offboarding.removed,
  student: routes.student.home,
  instructor: routes.instructor.home,
  admin: routes.admin.home,
};

/** The single decision point for which flow a person sees (D-01, D-02, D-07). */
export const resolveFlow = ({
  user,
  onboardingCompleted,
}: ResolveFlowInput): Flow => {
  // An unknown status or role can't expose private screens: it falls back to sign-in.
  if (!user || !isUserStatus(user.status)) {
    return "auth";
  }

  if (user.status !== "approved") {
    return FLOW_BY_INACTIVE_STATUS[user.status];
  }

  if (!onboardingCompleted) {
    return "onboarding";
  }

  return isUserRole(user.role) ? user.role : "auth";
};

/** The route a flow opens on (D-10). */
export const flowEntryRoute = (flow: Flow) => FLOW_ENTRY_ROUTES[flow];
