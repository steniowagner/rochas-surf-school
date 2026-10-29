import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteShell } from "@/components/site-shell";
import { hasLocale } from "@/i18n/locales";

// The pages are for invited testers, reached by the link the school sends (spec 076 D-07).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function UserJourneysLayout({ children, params }: LayoutProps<"/[lang]/user-journeys">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  return (
    <SiteShell locale={lang} width="wide">
      {children}
    </SiteShell>
  );
}
