import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary } from "@/i18n/get-dictionary";
import { hasLocale } from "@/i18n/locales";
import { TestAccountsPage } from "@/modules/user-journeys/pages/test-accounts";

export async function generateMetadata({ params }: PageProps<"/[lang]/user-journeys/test-accounts">): Promise<Metadata> {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { userJourneys, site } = await getDictionary(lang);

  return { title: `${userJourneys.testAccounts.metaTitle} — ${userJourneys.metaTitle} | ${site.name}` };
}

export default async function TestAccountsRoute({ params }: PageProps<"/[lang]/user-journeys/test-accounts">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { userJourneys } = await getDictionary(lang);

  return <TestAccountsPage locale={lang} text={userJourneys} />;
}
