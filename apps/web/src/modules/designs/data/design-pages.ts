/** The design pages that exist. A later spec adds its page here, in its dictionary and in `src/app/[lang]/designs/`. */
export const designPages = [
  { slug: "design-system", dictionaryKey: "designSystem" },
  { slug: "auth-flow", dictionaryKey: "authFlow" },
  { slug: "student-app", dictionaryKey: "studentApp" },
  { slug: "instructor-app", dictionaryKey: "instructorApp" },
  { slug: "admin-app", dictionaryKey: "adminApp" },
] as const;

export type DesignPage = (typeof designPages)[number];
