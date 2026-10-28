import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentCard } from "@/components/content-card";
import { ScreenIntro } from "@/components/screen-intro";
import { getSchoolWhatsapp } from "@/config/school-whatsapp";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasLocale } from "@/i18n/locales";

const LINK_CLASSES = "inline-flex min-h-11 items-center font-bold text-ink underline";

export async function generateMetadata({ params }: PageProps<"/[lang]/terms-of-use">): Promise<Metadata> {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { termsOfUse, site } = await getDictionary(lang);

  return {
    title: `${termsOfUse.metaTitle} | ${site.name}`,
    description: termsOfUse.metaDescription,
  };
}

export default async function TermsOfUsePage({ params }: PageProps<"/[lang]/terms-of-use">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { termsOfUse: terms } = await getDictionary(lang);
  const whatsapp = getSchoolWhatsapp();

  return (
    <>
      <ScreenIntro
        icon={<FileText size={32} strokeWidth={2} aria-hidden />}
        title={terms.title}
        description={terms.description}
      />
      <p className="ds-text-list-subtitle text-ink-2">
        {terms.lastUpdatedLabel}: {terms.lastUpdated}
      </p>
      <div className="flex flex-col gap-3">
        <ContentCard title={terms.about.title}>
          <p>{terms.about.text}</p>
        </ContentCard>
        <ContentCard title={terms.who.title}>
          <p>{terms.who.intro}</p>
          <ul className="list-disc space-y-1 pl-5">
            {terms.who.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ContentCard>
        <ContentCard title={terms.rules.title}>
          <p>{terms.rules.text}</p>
        </ContentCard>
        <ContentCard title={terms.content.title}>
          <p>{terms.content.intro}</p>
          <ul className="list-disc space-y-1 pl-5">
            {terms.content.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>{terms.content.outro}</p>
        </ContentCard>
        <ContentCard title={terms.reporting.title}>
          <p>{terms.reporting.text}</p>
          <a href={whatsapp.href} className={LINK_CLASSES}>
            {whatsapp.formatted}
          </a>
        </ContentCard>
        <ContentCard title={terms.payments.title}>
          <p>{terms.payments.text}</p>
        </ContentCard>
        <ContentCard title={terms.coverage.title}>
          <p>{terms.coverage.text}</p>
        </ContentCard>
        <ContentCard title={terms.privacy.title}>
          <p>{terms.privacy.text}</p>
          <a href={`/${lang}/privacy-policy`} className={LINK_CLASSES}>
            {terms.privacy.policyLink}
          </a>
          <a href={`/${lang}/account-deletion`} className={LINK_CLASSES}>
            {terms.privacy.deletionLink}
          </a>
        </ContentCard>
        <ContentCard title={terms.changes.title}>
          <p>{terms.changes.text}</p>
        </ContentCard>
        <ContentCard title={terms.law.title}>
          <p>{terms.law.text}</p>
        </ContentCard>
      </div>
    </>
  );
}
