import type { Metadata } from "next";
import { Barlow_Condensed, Nunito } from "next/font/google";
import { notFound } from "next/navigation";

import { getDictionary } from "@/i18n/get-dictionary";
import { hasLocale, htmlLang, locales } from "@/i18n/locales";

import "../globals.css";

// Font roles from @rochas-surf-school/design-tokens: display for titles and numbers, body for everything else.
const display = Barlow_Condensed({
  variable: "--ds-font-display",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "latin-ext"],
});

const body = Nunito({
  variable: "--ds-font-body",
  weight: ["400", "600", "700", "800"],
  subsets: ["latin", "latin-ext"],
});

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dictionary = await getDictionary(lang);

  return { title: dictionary.site.name, description: dictionary.site.description };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  return (
    <html
      lang={htmlLang[lang]}
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
