import { notFound } from "next/navigation";

import { getDictionary } from "@/i18n/get-dictionary";
import { hasLocale } from "@/i18n/locales";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dictionary = await getDictionary(lang);

  return <main>{dictionary.site.name}</main>;
}
