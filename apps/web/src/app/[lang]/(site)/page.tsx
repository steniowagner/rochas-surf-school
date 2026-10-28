import { FileText, Palette, ShieldCheck, UserX, Waves } from "lucide-react";
import { notFound } from "next/navigation";

import { LinkRow } from "@/components/link-row";
import { ScreenIntro } from "@/components/screen-intro";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasLocale } from "@/i18n/locales";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { site, home } = await getDictionary(lang);

  return (
    <>
      <ScreenIntro
        icon={<Waves size={32} strokeWidth={2} aria-hidden />}
        eyebrow={home.title}
        title={site.name}
        description={home.description}
      />
      <div className="flex flex-col gap-3">
        <LinkRow
          href={`/${lang}/privacy-policy`}
          icon={<ShieldCheck size={24} strokeWidth={2} aria-hidden />}
          title={home.privacyPolicy.title}
          description={home.privacyPolicy.description}
        />
        <LinkRow
          href={`/${lang}/terms-of-use`}
          icon={<FileText size={24} strokeWidth={2} aria-hidden />}
          title={home.termsOfUse.title}
          description={home.termsOfUse.description}
        />
        <LinkRow
          href={`/${lang}/account-deletion`}
          icon={<UserX size={24} strokeWidth={2} aria-hidden />}
          title={home.accountDeletion.title}
          description={home.accountDeletion.description}
        />
        <LinkRow
          href={`/${lang}/designs`}
          icon={<Palette size={24} strokeWidth={2} aria-hidden />}
          title={home.designs.title}
          description={home.designs.description}
        />
      </div>
    </>
  );
}
