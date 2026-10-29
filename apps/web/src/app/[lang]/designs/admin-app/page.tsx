import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary } from "@/i18n/get-dictionary";
import { hasLocale } from "@/i18n/locales";
import { AdminAppPage } from "@/modules/designs/pages/admin-app";

export async function generateMetadata({ params }: PageProps<"/[lang]/designs/admin-app">): Promise<Metadata> {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { adminApp, site } = await getDictionary(lang);

  return { title: `${adminApp.metaTitle} | ${site.name}`, description: adminApp.description };
}

export default async function AdminAppRoute({ params }: PageProps<"/[lang]/designs/admin-app">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { adminApp, authFlow } = await getDictionary(lang);

  return <AdminAppPage locale={lang} text={adminApp} schoolRules={authFlow.schoolRules} />;
}
