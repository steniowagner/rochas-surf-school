import { Palette } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LinkRow } from "@/components/link-row";
import { ScreenIntro } from "@/components/screen-intro";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasLocale } from "@/i18n/locales";
import { designPages } from "@/modules/designs/data/design-pages";

export async function generateMetadata({ params }: PageProps<"/[lang]/designs">): Promise<Metadata> {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { designs, site } = await getDictionary(lang);

  return { title: `${designs.metaTitle} | ${site.name}`, description: designs.metaDescription };
}

export default async function DesignsPage({ params }: PageProps<"/[lang]/designs">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { designs } = await getDictionary(lang);

  return (
    <>
      <ScreenIntro
        icon={<Palette size={32} strokeWidth={2} aria-hidden />}
        eyebrow={designs.metaTitle}
        title={designs.title}
        description={designs.description}
      />
      <div className="flex flex-col gap-3" data-testid="design-pages">
        {designPages.map((page) => (
          <LinkRow
            key={page.slug}
            href={`/${lang}/designs/${page.slug}`}
            icon={<Palette size={24} strokeWidth={2} aria-hidden />}
            title={designs.pages[page.dictionaryKey].title}
            description={designs.pages[page.dictionaryKey].description}
          />
        ))}
      </div>
    </>
  );
}
