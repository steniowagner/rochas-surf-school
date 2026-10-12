import type { Href } from "expo-router";

export type Flow =
  | "auth"
  | "pending"
  | "onboarding"
  | "rules-update"
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
  // E.164, or null until the account adds one in onboarding.
  whatsappNumber: string | null;
  // `false` hides the number from everyone but admins.
  whatsappVisible: boolean;
  // `true` once the account accepted the current school rules (always, while there are none).
  rulesAccepted: boolean;
  // `true` once the account accepted any version of the school rules: a new version is an update, not a first acceptance.
  rulesAcceptedBefore: boolean;
  // The reason an admin gave when denying the account, or null.
  denialReason: string | null;
  // "requested" or "denied" once a deleted account asked to be reactivated, otherwise null.
  reactivationStatus: string | null;
};

export type ResolveFlowInput = {
  user: SessionUser | null;
  // An approved account has a WhatsApp number and accepted the current school rules (D-03).
  onboardingCompleted: boolean;
};

export type OnboardingStep = "whatsapp" | "school-rules";

export type FlowEntryRoutes = Record<Exclude<Flow, "onboarding">, Href>;
