import type { Metadata } from "next";
import { Barlow_Condensed, Nunito } from "next/font/google";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasLocale, htmlLang, locales } from "@/i18n/locales";

import "../globals.css";

// Runs before first paint: applies the stored choice, so there is no flash of the other theme.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}`;

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

  const dictionary = await getDictionary(lang);

  return (
    <html
      lang={htmlLang[lang]}
      className={`${display.variable} ${body.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <div className="mx-auto flex min-h-screen w-full max-w-160 flex-col px-5">
          <SiteHeader
            locale={lang}
            homeLabel={dictionary.header.homeLabel}
            languageLabel={dictionary.header.languageLabel}
            themeLabel={dictionary.header.themeLabel}
          />
          <main className="flex flex-1 flex-col gap-[22px] pb-8 pt-2">{children}</main>
          <footer className="ds-text-list-subtitle py-6 text-center text-ink-2">
            {dictionary.footer.text}
          </footer>
        </div>
      </body>
    </html>
  );
}
