import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary } from "@/i18n/get-dictionary";
import { hasLocale } from "@/i18n/locales";
import { StudentAppPage } from "@/modules/designs/pages/student-app";

export async function generateMetadata({ params }: PageProps<"/[lang]/designs/student-app">): Promise<Metadata> {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { studentApp, site } = await getDictionary(lang);

  return { title: `${studentApp.metaTitle} | ${site.name}`, description: studentApp.description };
}

export default async function StudentAppRoute({ params }: PageProps<"/[lang]/designs/student-app">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { authFlow, studentApp } = await getDictionary(lang);

  return <StudentAppPage locale={lang} text={studentApp} schoolRules={authFlow.schoolRules} />;
}
