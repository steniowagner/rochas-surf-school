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
    myClasses: "/student/my-classes",
    myHistory: "/student/my-history",
    notifications: "/student/notifications",
    school: "/student/school",
    profile: "/student/profile",
    editProfile: "/student/edit-profile",
    whatsapp: "/student/whatsapp",
    schoolRules: "/student/school-rules",
    classDetail: (id: string): Href => ({
      pathname: "/student/class/[id]",
      params: { id },
    }),
  },
  instructor: {
    home: "/instructor",
    classes: "/instructor/classes",
    people: "/instructor/people",
    notifications: "/instructor/notifications",
    profile: "/instructor/profile",
    editProfile: "/instructor/edit-profile",
    whatsapp: "/instructor/whatsapp",
    schoolRules: "/instructor/school-rules",
    classDetail: (id: string): Href => ({
      pathname: "/instructor/class/[id]",
      params: { id },
    }),
  },
  admin: {
    home: "/admin",
    classes: "/admin/classes",
    profile: "/admin/profile",
    registrations: "/admin/registrations",
    classRequests: "/admin/class-requests",
    enrolStudent: "/admin/enrol-student",
    cancellationRules: "/admin/cancellation-rules",
    people: "/admin/people",
    notifications: "/admin/notifications",
    newClass: (params?: { date?: string }): Href => ({
      pathname: "/admin/new-class",
      params,
    }),
    editProfile: "/admin/edit-profile",
    whatsapp: "/admin/whatsapp",
    schoolRules: "/admin/school-rules",
    schoolSettings: "/admin/school-settings",
    classDetail: (id: string): Href => ({
      pathname: "/admin/class/[id]",
      params: { id },
    }),
    editClass: (id: string): Href => ({
      pathname: "/admin/edit-class/[id]",
      params: { id },
    }),
  },
} as const;
