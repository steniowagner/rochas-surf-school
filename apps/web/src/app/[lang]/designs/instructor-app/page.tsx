import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary } from "@/i18n/get-dictionary";
import { hasLocale } from "@/i18n/locales";
import { InstructorAppPage } from "@/modules/designs/pages/instructor-app";

export async function generateMetadata({ params }: PageProps<"/[lang]/designs/instructor-app">): Promise<Metadata> {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { instructorApp, site } = await getDictionary(lang);

  return { title: `${instructorApp.metaTitle} | ${site.name}`, description: instructorApp.description };
}

export default async function InstructorAppRoute({ params }: PageProps<"/[lang]/designs/instructor-app">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { authFlow, instructorApp } = await getDictionary(lang);

  return <InstructorAppPage locale={lang} text={instructorApp} schoolRules={authFlow.schoolRules} />;
}
