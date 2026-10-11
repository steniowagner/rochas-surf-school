import { USER_ROLES, USER_STATUSES } from "@rochas-surf-school/auth";
import type { UserRole, UserStatus } from "@rochas-surf-school/auth";
import type { Href } from "expo-router";

import { routes } from "@/constants/routes";

import {
  Flow,
  FlowEntryRoutes,
  OnboardingStep,
  ResolveFlowInput,
  SessionUser,
} from "./resolve-flow.types";

const isUserRole = (role: string): role is UserRole =>
  (USER_ROLES as readonly string[]).includes(role);

const isUserStatus = (status: string): status is UserStatus =>
  (USER_STATUSES as readonly string[]).includes(status);

const FLOW_BY_INACTIVE_STATUS: Record<Exclude<UserStatus, "approved">, Flow> = {
  pending: "pending",
  deleted: "reactivation",
  denied: "offboarding-denied",
  removed: "offboarding-removed",
};

const FLOW_ENTRY_ROUTES: FlowEntryRoutes = {
  auth: routes.auth.signIn,
  pending: routes.pending.home,
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

/** An approved account finished onboarding with a WhatsApp number and the current school rules accepted (D-03). */
export const isOnboardingCompleted = (user: SessionUser | null): boolean =>
  !!user?.whatsappNumber && user.rulesAccepted === true;

const ONBOARDING_ENTRY_ROUTES: Record<OnboardingStep, Href> = {
  whatsapp: routes.onboarding.whatsapp,
  "school-rules": routes.onboarding.schoolRules,
};

/** The onboarding step an approved account is on: the WhatsApp number first, then the school rules (D-05). */
export const onboardingStep = (user: SessionUser | null): OnboardingStep =>
  user?.whatsappNumber ? "school-rules" : "whatsapp";

/** The route a flow opens on (D-10); the onboarding flow opens on the account's step (D-05). */
export const flowEntryRoute = (flow: Flow, user: SessionUser | null): Href =>
  flow === "onboarding"
    ? ONBOARDING_ENTRY_ROUTES[onboardingStep(user)]
    : FLOW_ENTRY_ROUTES[flow];
