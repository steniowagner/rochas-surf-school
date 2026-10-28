import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentCard } from "@/components/content-card";
import { ScreenIntro } from "@/components/screen-intro";
import { getSchoolLegal } from "@/config/school-legal";
import { getSchoolWhatsapp } from "@/config/school-whatsapp";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasLocale } from "@/i18n/locales";

const LINK_CLASSES = "inline-flex min-h-11 items-center font-bold text-ink underline";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy-policy">): Promise<Metadata> {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { privacyPolicy, site } = await getDictionary(lang);

  return {
    title: `${privacyPolicy.metaTitle} | ${site.name}`,
    description: privacyPolicy.metaDescription,
  };
}

export default async function PrivacyPolicyPage({ params }: PageProps<"/[lang]/privacy-policy">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { privacyPolicy: policy } = await getDictionary(lang);
  const whatsapp = getSchoolWhatsapp();
  const legal = getSchoolLegal();

  return (
    <>
      <ScreenIntro
        icon={<ShieldCheck size={32} strokeWidth={2} aria-hidden />}
        title={policy.title}
        description={policy.description}
      />
      <p className="ds-text-list-subtitle text-ink-2">
        {policy.lastUpdatedLabel}: {policy.lastUpdated}
      </p>
      <div className="flex flex-col gap-3">
        <ContentCard title={policy.controller.title}>
          <p>{policy.controller.text}</p>
          <dl className="space-y-1">
            <div>
              <dt className="ds-text-list-subtitle text-ink-2">{policy.controller.legalNameLabel}</dt>
              <dd>{legal.legalName}</dd>
            </div>
            {legal.cnpj ? (
              <div>
                <dt className="ds-text-list-subtitle text-ink-2">{policy.controller.cnpjLabel}</dt>
                <dd>{legal.cnpj}</dd>
              </div>
            ) : null}
            <div>
              <dt className="ds-text-list-subtitle text-ink-2">{policy.controller.whatsappLabel}</dt>
              <dd>
                <a href={whatsapp.href} className={LINK_CLASSES}>
                  {whatsapp.formatted}
                </a>
              </dd>
            </div>
          </dl>
        </ContentCard>
        <ContentCard title={policy.dpo.title}>
          <p>{policy.dpo.text}</p>
          <dl className="space-y-1">
            <div>
              <dt className="ds-text-list-subtitle text-ink-2">{policy.dpo.nameLabel}</dt>
              <dd>{legal.dpoName}</dd>
            </div>
            <div>
              <dt className="ds-text-list-subtitle text-ink-2">{policy.dpo.emailLabel}</dt>
              <dd>
                <a href={`mailto:${legal.dpoEmail}`} className={LINK_CLASSES}>
                  {legal.dpoEmail}
                </a>
              </dd>
            </div>
          </dl>
        </ContentCard>
        <ContentCard title={policy.collected.title}>
          <p>{policy.collected.intro}</p>
          <ul className="list-disc space-y-1 pl-5">
            {policy.collected.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ContentCard>
        <ContentCard title={policy.purposes.title}>
          <p>{policy.purposes.intro}</p>
          <ul className="list-disc space-y-1 pl-5">
            {policy.purposes.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ContentCard>
        <ContentCard title={policy.services.title}>
          <p>{policy.services.intro}</p>
          <ul className="list-disc space-y-1 pl-5">
            {policy.services.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ContentCard>
        <ContentCard title={policy.transfers.title}>
          <p>{policy.transfers.text}</p>
        </ContentCard>
        <ContentCard title={policy.retention.title}>
          <p>{policy.retention.intro}</p>
          <ul className="list-disc space-y-1 pl-5">
            {policy.retention.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ContentCard>
        <ContentCard title={policy.security.title}>
          <p>{policy.security.intro}</p>
          <ul className="list-disc space-y-1 pl-5">
            {policy.security.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ContentCard>
        <ContentCard title={policy.adults.title}>
          <p>{policy.adults.text}</p>
        </ContentCard>
        <ContentCard title={policy.rights.title}>
          <p>{policy.rights.intro}</p>
          <ul className="list-disc space-y-1 pl-5">
            {policy.rights.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>{policy.rights.howTo}</p>
          <p>{policy.rights.complaint}</p>
        </ContentCard>
        <ContentCard title={policy.deletion.title}>
          <p>{policy.deletion.text}</p>
          <a href={`/${lang}/account-deletion`} className={LINK_CLASSES}>
            {policy.deletion.link}
          </a>
        </ContentCard>
        <ContentCard title={policy.terms.title}>
          <p>{policy.terms.text}</p>
          <a href={`/${lang}/terms-of-use`} className={LINK_CLASSES}>
            {policy.terms.link}
          </a>
        </ContentCard>
        <ContentCard title={policy.site.title}>
          <p>{policy.site.text}</p>
        </ContentCard>
        <ContentCard title={policy.changes.title}>
          <p>{policy.changes.text}</p>
        </ContentCard>
      </div>
    </>
  );
}
