import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary } from "@/i18n/get-dictionary";
import { hasLocale } from "@/i18n/locales";
import { AuthFlowPage } from "@/modules/designs/pages/auth-flow";

export async function generateMetadata({ params }: PageProps<"/[lang]/designs/auth-flow">): Promise<Metadata> {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { authFlow, site } = await getDictionary(lang);

  return { title: `${authFlow.metaTitle} | ${site.name}`, description: authFlow.description };
}

export default async function AuthFlowRoute({ params }: PageProps<"/[lang]/designs/auth-flow">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { authFlow } = await getDictionary(lang);

  return <AuthFlowPage locale={lang} text={authFlow} />;
}
