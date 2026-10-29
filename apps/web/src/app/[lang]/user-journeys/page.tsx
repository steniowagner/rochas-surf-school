import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary } from "@/i18n/get-dictionary";
import { hasLocale } from "@/i18n/locales";
import { UserJourneysIndexPage } from "@/modules/user-journeys/pages/user-journeys-index";

export async function generateMetadata({ params }: PageProps<"/[lang]/user-journeys">): Promise<Metadata> {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { userJourneys, site } = await getDictionary(lang);

  return { title: `${userJourneys.metaTitle} | ${site.name}`, description: userJourneys.metaDescription };
}

export default async function UserJourneysRoute({ params }: PageProps<"/[lang]/user-journeys">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { userJourneys } = await getDictionary(lang);

  return <UserJourneysIndexPage locale={lang} text={userJourneys} />;
}
