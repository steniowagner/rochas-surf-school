import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary } from "@/i18n/get-dictionary";
import { hasLocale } from "@/i18n/locales";
import { isUserJourneyFlowSlug, userJourneyFlowSlugs } from "@/modules/user-journeys/data/user-journey-flows";
import { userJourneyTexts } from "@/modules/user-journeys/i18n/user-journey-texts";
import { UserJourneyFlowPage } from "@/modules/user-journeys/pages/user-journey-flow";

// The four flows in each language (spec 076 D-12): any other flow answers 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return userJourneyFlowSlugs.map((flow) => ({ flow }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/user-journeys/[flow]">): Promise<Metadata> {
  const { lang, flow } = await params;

  if (!hasLocale(lang) || !isUserJourneyFlowSlug(flow)) {
    notFound();
  }

  const { userJourneys, site } = await getDictionary(lang);

  return {
    title: `${userJourneyTexts[lang].flows[flow].title} — ${userJourneys.metaTitle} | ${site.name}`,
    description: userJourneyTexts[lang].flows[flow].description,
  };
}

export default async function UserJourneyFlowRoute({ params }: PageProps<"/[lang]/user-journeys/[flow]">) {
  const { lang, flow } = await params;

  if (!hasLocale(lang) || !isUserJourneyFlowSlug(flow)) {
    notFound();
  }

  const { site, userJourneys } = await getDictionary(lang);

  return <UserJourneyFlowPage locale={lang} flow={flow} text={userJourneys} siteName={site.name} />;
}
