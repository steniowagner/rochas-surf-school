import type { Locale } from "@/i18n/locales";

const designPageByPrefix: Record<string, string> = {
  AF: "auth-flow",
  ST: "student-app",
  IN: "instructor-app",
  AD: "admin-app",
};

/** The design page a frame id belongs to, from its prefix (D-14): `AF` → `auth-flow`, `ST` → `student-app`… */
export const designPageOf = (designId: string): string => {
  const page = designPageByPrefix[designId.slice(0, 2)];

  if (!page) {
    throw new Error(`No design page for "${designId}"`);
  }

  return page;
};

/** The URL of a design frame, in the page's language: `/{lang}/designs/<page>#<id>`. */
export const designHref = (locale: Locale, designId: string): string =>
  `/${locale}/designs/${designPageOf(designId)}#${designId}`;
