import { MessageCircle, UserX } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentCard } from "@/components/content-card";
import { ScreenIntro } from "@/components/screen-intro";
import { Button } from "@/components/ui/button";
import { getSchoolWhatsapp } from "@/config/school-whatsapp";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasLocale } from "@/i18n/locales";

export async function generateMetadata({ params }: PageProps<"/[lang]/account-deletion">): Promise<Metadata> {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { accountDeletion, site } = await getDictionary(lang);

  return {
    title: `${accountDeletion.metaTitle} | ${site.name}`,
    description: accountDeletion.metaDescription,
  };
}

export default async function AccountDeletionPage({ params }: PageProps<"/[lang]/account-deletion">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { accountDeletion: deletion } = await getDictionary(lang);
  const whatsapp = getSchoolWhatsapp();

  return (
    <>
      <ScreenIntro
        icon={<UserX size={32} strokeWidth={2} aria-hidden />}
        title={deletion.title}
        description={deletion.description}
      />
      <div className="flex flex-col gap-3">
        <ContentCard title={deletion.inApp.title}>
          <p>{deletion.inApp.text}</p>
        </ContentCard>
        <ContentCard title={deletion.noApp.title}>
          <p>{deletion.noApp.text}</p>
          <p>
            {deletion.noApp.numberLabel}:{" "}
            <a href={whatsapp.href} className="inline-flex min-h-11 items-center font-bold text-ink underline">
              {whatsapp.formatted}
            </a>
          </p>
        </ContentCard>
        <ContentCard title={deletion.erased.title}>
          <p>{deletion.erased.intro}</p>
          <ul className="list-disc space-y-1 pl-5">
            {deletion.erased.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ContentCard>
        <ContentCard title={deletion.kept.title}>
          <p>{deletion.kept.intro}</p>
          <ul className="list-disc space-y-1 pl-5">
            {deletion.kept.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ContentCard>
        <ContentCard title={deletion.timing.title}>
          <p>{deletion.timing.text}</p>
        </ContentCard>
      </div>
      <Button
        variant="primary"
        href={whatsapp.href}
        icon={<MessageCircle size={20} strokeWidth={2} aria-hidden />}
      >
        {deletion.noApp.button}
      </Button>
    </>
  );
}
