import type { Href } from "expo-router";

export type Flow =
  | "auth"
  | "onboarding"
  | "reactivation"
  | "offboarding-denied"
  | "offboarding-removed"
  | "student"
  | "instructor"
  | "admin";

/** The signed-in account as the API returns it. `role` and `status` are plain strings on the wire. */
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  // ISO 8601, UTC.
  createdAt: string;
};

export type ResolveFlowInput = {
  user: SessionUser | null;
  // An approved account has a WhatsApp number and accepted the current school rules (D-03).
  onboardingCompleted: boolean;
};

export type FlowEntryRoutes = Record<Flow, Href>;
