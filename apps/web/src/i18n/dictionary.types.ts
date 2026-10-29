import type { AuthFlowEntryId } from "@/modules/designs/data/auth-flow-ids";
import type { InstructorAppEntryId } from "@/modules/designs/data/instructor-app-ids";
import type { StudentAppEntryId } from "@/modules/designs/data/student-app-ids";
import type { DesignSystemEntryId } from "@/modules/designs/data/design-system-ids";

/** Every string of the site, in one language. Each dictionary must satisfy this type exactly. */
export type Dictionary = {
  site: {
    name: string;
    description: string;
  };
  header: {
    homeLabel: string;
    languageLabel: string;
    themeLabel: string;
  };
  footer: {
    text: string;
  };
  home: {
    title: string;
    description: string;
    privacyPolicy: { title: string; description: string };
    termsOfUse: { title: string; description: string };
    accountDeletion: { title: string; description: string };
    designs: { title: string; description: string };
  };
  designs: {
    metaTitle: string;
    metaDescription: string;
    title: string;
    description: string;
    pages: { designSystem: { title: string; description: string }; authFlow: { title: string; description: string }; studentApp: { title: string; description: string }; instructorApp: { title: string; description: string } };
  };
  designSystem: {
    metaTitle: string;
    title: string;
    eyebrow: string;
    description: string;
    sections: Record<"color" | "typography" | "shape" | "controls" | "chips" | "classCard" | "structure" | "rules" | "states", { title: string; description: string }>;
    entries: Record<DesignSystemEntryId, { title: string; note: string }>;
    rules: string[];
    labels: { light: string, dark: string, theme: string, values: string, family: string, weight: string, size: string, spacing: string, caseUpper: string, caseNormal: string, default: string, disabled: string, loading: string, withIcon: string, touchTarget: string, iconSizes: string, guest: string, formerStudent: string };
  };
  authFlow: {
    metaTitle: string;
    title: string;
    eyebrow: string;
    description: string;
    sections: Record<"signIn" | "email" | "onboarding" | "closedAccount", { title: string; description: string }>;
    entries: Record<AuthFlowEntryId, { title: string; note: string }>;
    /** Introduces the list of the other messages an element can show, in an entry's note. */
    otherMessages: string;
    /** The mock school rules of the rules frames: text typed by the school, not app copy. */
    schoolRules: { title: string; description: string }[];
    /** The mock reason an admin typed when denying an account. */
    denialReason: string;
  };
  studentApp: {
    metaTitle: string;
    title: string;
    eyebrow: string;
    description: string;
    sections: Record<"agenda" | "class" | "myClasses" | "school" | "profile" | "notifications", { title: string; description: string }>;
    entries: Record<StudentAppEntryId, { title: string; note: string }>;
    /** Introduces the list of the other messages an element can show, in an entry's note. */
    otherMessages: string;
    /** The mock reason the school typed when denying a request. */
    denialReason: string;
    /** The mock reason the school typed when taking a student out of a class. */
    takeOutReason: string;
    /** The mock notes of the class. */
    classNotes: string;
    /** The mock cancellation rule of each sport. */
    cancellationRules: { surf: string; skate: string };
    /** The in-app text the backend writes for each notification type a student gets (`push-messages.ts`), with the mock class's values. */
    notifications: { type: string; title: string; body?: string; bodyFrom?: "denialReason" | "takeOutReason"; time: string }[];
  };
  instructorApp: {
    metaTitle: string;
    title: string;
    eyebrow: string;
    description: string;
    sections: Record<"home" | "classes" | "class" | "myClasses" | "occupancy" | "more", { title: string; description: string }>;
    entries: Record<InstructorAppEntryId, { title: string; note: string }>;
    /** Introduces the list of the other messages an element can show, in an entry's note. */
    otherMessages: string;
    /** The mock notes of the class. */
    classNotes: string;
    /** The mock cancellation rule of each sport. */
    cancellationRules: { surf: string; skate: string };
    /** The in-app text the backend writes for each notification type an instructor gets (`push-messages.ts`), with the mock classes' values. */
    notifications: { type: string; title: string; body: string; time: string }[];
  };
  privacyPolicy: {
    metaTitle: string;
    metaDescription: string;
    title: string;
    description: string;
    lastUpdatedLabel: string;
    lastUpdated: string;
    controller: { title: string; text: string; legalNameLabel: string; cnpjLabel: string; whatsappLabel: string };
    dpo: { title: string; text: string; nameLabel: string; emailLabel: string };
    collected: { title: string; intro: string; items: string[] };
    purposes: { title: string; intro: string; items: string[] };
    services: { title: string; intro: string; items: string[] };
    transfers: { title: string; text: string };
    retention: { title: string; intro: string; items: string[] };
    security: { title: string; intro: string; items: string[] };
    adults: { title: string; text: string };
    rights: { title: string; intro: string; items: string[]; howTo: string; complaint: string };
    deletion: { title: string; text: string; link: string };
    terms: { title: string; text: string; link: string };
    site: { title: string; text: string };
    changes: { title: string; text: string };
  };
  termsOfUse: {
    metaTitle: string;
    metaDescription: string;
    title: string;
    description: string;
    lastUpdatedLabel: string;
    lastUpdated: string;
    about: { title: string; text: string };
    who: { title: string; intro: string; items: string[] };
    rules: { title: string; text: string };
    content: { title: string; intro: string; items: string[]; outro: string };
    reporting: { title: string; text: string };
    payments: { title: string; text: string };
    coverage: { title: string; text: string };
    privacy: { title: string; text: string; policyLink: string; deletionLink: string };
    changes: { title: string; text: string };
    law: { title: string; text: string };
  };
  accountDeletion: {
    metaTitle: string;
    metaDescription: string;
    title: string;
    description: string;
    inApp: { title: string; text: string };
    noApp: { title: string; text: string; numberLabel: string; button: string };
    erased: { title: string; intro: string; items: string[] };
    kept: { title: string; intro: string; items: string[] };
    timing: { title: string; text: string };
  };
};
