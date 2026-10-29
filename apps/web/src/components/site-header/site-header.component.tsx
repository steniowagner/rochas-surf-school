import Image from "next/image";

import logo from "@/assets/rochas-surf-school-logo.svg";
import { LanguagePicker } from "@/components/language-picker";
import { ThemeToggle } from "@/components/theme-toggle";

import type { SiteHeaderProps } from "./site-header.types";

export function SiteHeader({ locale, homeLabel, languageLabel, themeLabel }: SiteHeaderProps) {
  return (
    <header className="flex items-center justify-between py-4">
      <a href={`/${locale}`} aria-label={homeLabel} className="flex min-h-11 min-w-11 items-center">
        <Image src={logo} alt="" priority className="h-16 w-auto" />
      </a>
      <div className="flex items-center gap-2">
        <ThemeToggle label={themeLabel} />
        <LanguagePicker locale={locale} label={languageLabel} />
      </div>
    </header>
  );
}
