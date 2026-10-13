import type { Href } from "expo-router";

/** Every app route in one place. `as const` keeps the paths typed by Expo Router's typed routes. */
export const routes = {
  // The entry route: it redirects to the screen of the account's current flow.
  home: "/",
  auth: {
    signIn: "/auth",
    emailChoice: "/auth/email",
    emailSignIn: "/auth/email-sign-in",
    createAccount: (params?: { email?: string }): Href => ({
      pathname: "/auth/create-account",
      params,
    }),
    confirmCode: (params: { email: string; name?: string }): Href => ({
      pathname: "/auth/confirm-code",
      params,
    }),
    googleName: (params: { idToken: string; name?: string }): Href => ({
      pathname: "/auth/google-name",
      params,
    }),
  },
  pending: {
    home: "/pending",
  },
  onboarding: {
    whatsapp: "/onboarding",
    schoolRules: "/onboarding/school-rules",
  },
  rulesUpdate: {
    home: "/rules-update",
  },
  reactivation: {
    home: "/reactivation",
  },
  offboarding: {
    denied: "/offboarding/denied",
    removed: "/offboarding/removed",
  },
  student: {
    home: "/student",
  },
  instructor: {
    home: "/instructor",
  },
  admin: {
    home: "/admin",
    registrations: "/admin/registrations",
  },
} as const;
