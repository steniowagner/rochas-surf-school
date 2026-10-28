import { notFound } from "next/navigation";

import { SiteShell } from "@/components/site-shell";
import { hasLocale } from "@/i18n/locales";

export default async function DesignsLayout({ children, params }: LayoutProps<"/[lang]/designs">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  return (
    <SiteShell locale={lang} width="wide">
      {children}
    </SiteShell>
  );
}
