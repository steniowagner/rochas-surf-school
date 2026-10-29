import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary } from "@/i18n/get-dictionary";
import { hasLocale } from "@/i18n/locales";
import { DesignSystemPage } from "@/modules/designs/pages/design-system";

export async function generateMetadata({ params }: PageProps<"/[lang]/designs/design-system">): Promise<Metadata> {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { designSystem, site } = await getDictionary(lang);

  return { title: `${designSystem.metaTitle} | ${site.name}`, description: designSystem.description };
}

export default async function DesignSystemRoute({ params }: PageProps<"/[lang]/designs/design-system">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { designSystem } = await getDictionary(lang);

  return <DesignSystemPage locale={lang} text={designSystem} />;
}
