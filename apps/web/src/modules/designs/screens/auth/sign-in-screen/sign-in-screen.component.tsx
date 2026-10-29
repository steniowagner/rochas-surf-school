import { AppIcon } from "@/modules/designs/components/app-icon";
import { AuthButton } from "@/modules/designs/components/auth-button";
import { LanguageSheet } from "@/modules/designs/components/language-sheet";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { ScreenToast } from "@/modules/designs/components/screen-toast";
import { TermsLine } from "@/modules/designs/components/terms-line";
import { assetSrc } from "@/modules/designs/assets/asset-src";
import googleLogo from "@/modules/designs/assets/google-logo.svg";
import teamHero from "@/modules/designs/assets/team-hero.jpg";
import { localeOptions } from "@/modules/designs/data/fortaleza";
import { appLocaleBySiteLocale } from "@/modules/designs/i18n/app-locale";
import { appT } from "@/modules/designs/i18n/app-t";

import type { SignInScreenProps } from "./sign-in-screen.types";

// The brand name is not translated.
const wordmark = [
  { line: "Rocha's", accent: false },
  { line: "Surf", accent: true },
  { line: "School", accent: false },
];

// The photo fades to grape at the bottom so the buttons stay legible.
const grapeFade = "linear-gradient(to bottom, transparent 45%, color-mix(in srgb, var(--ds-grape) 90%, transparent) 100%)";

/** The sign-in screen: always the light palette (the app draws it so in both themes), the photo under everything. */
export function SignInScreen({ locale, languageSheetOpen = false, googleLoading = false, toastKey }: SignInScreenProps) {
  const t = (key: string) => appT(locale, key);
  const current = appLocaleBySiteLocale[locale];
  const option = localeOptions.find((candidate) => candidate.key === current) ?? localeOptions[0];

  return (
    <div data-theme="light" className="contents">
      <PhoneFrame fullBleed contentClassName="overflow-hidden bg-grape">
        {/* A plain img: auth-flow.html is generated from this page and needs the file as it is. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={assetSrc(teamHero)} alt="" className="absolute inset-0 size-full object-cover" style={{ filter: "grayscale(1) contrast(1.1)" }} />
        <div className="absolute inset-0 bg-grape opacity-85 mix-blend-multiply" />
        <div className="absolute inset-0" style={{ backgroundImage: grapeFade }} />

        <div className="absolute left-6 right-4.5 top-17.75 z-10 flex items-center justify-between">
          <span className="flex size-11 items-center justify-center rounded-control bg-sun text-on-color">
            <AppIcon name="MaterialCommunityIcons:waves" size={23} />
          </span>
          <span role="button" aria-label={`${t("language.button")}: ${option.name}`} className="flex h-9.5 items-center gap-1.75 rounded-full border-[1.5px] border-white/55 pl-1.5 pr-3">
            <span className="w-6 text-center text-base">{option.flag}</span>
            <span className="ds-text-button text-on-color">{option.key.slice(0, 2).toUpperCase()}</span>
            <AppIcon name="Ionicons:chevron-down" size={14} className="text-on-color" />
          </span>
        </div>

        <h1 className="absolute inset-x-5 top-35.25 flex flex-col">
          {wordmark.map(({ line, accent }) => (
            <span key={line} className={`ds-text-wordmark ${accent ? "text-sun" : "text-on-color"}`}>
              {line}
            </span>
          ))}
        </h1>

        <div className="absolute inset-x-5 bottom-8.5 flex flex-col gap-2.5">
          <AuthButton
            variant="light"
            label={t("auth.continueWithGoogle")}
            loading={googleLoading}
            // eslint-disable-next-line @next/next/no-img-element
            icon={<img src={assetSrc(googleLogo)} alt="" width={18} height={18} />}
          />
          <AuthButton variant="primary" label={t("auth.continueWithEmail")} icon={<AppIcon name="Ionicons:mail-outline" size={20} />} />
          <div className="mt-1.5">
            <TermsLine locale={locale} className="text-white/90" />
          </div>
        </div>

        {languageSheetOpen ? (
          <LanguageSheet
            title={t("language.title")}
            description={t("language.description")}
            locales={localeOptions.map((candidate) => ({ flag: candidate.flag, name: candidate.name, selected: candidate.key === current }))}
          />
        ) : null}
        {toastKey ? <ScreenToast message={t(toastKey)} /> : null}
      </PhoneFrame>
    </div>
  );
}
