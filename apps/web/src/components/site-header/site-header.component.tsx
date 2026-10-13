import { Waves } from "lucide-react";

import { LanguagePicker } from "@/components/language-picker";
import { ThemeToggle } from "@/components/theme-toggle";

import type { SiteHeaderProps } from "./site-header.types";

export function SiteHeader({ locale, homeLabel, languageLabel, themeLabel }: SiteHeaderProps) {
  return (
    <header className="flex items-center justify-between py-4">
      <a
        href={`/${locale}`}
        aria-label={homeLabel}
        className="flex h-11 w-11 items-center justify-center rounded-control bg-sun text-on-color"
      >
        <Waves size={24} strokeWidth={2} aria-hidden />
      </a>
      <div className="flex items-center gap-2">
        <ThemeToggle label={themeLabel} />
        <LanguagePicker locale={locale} label={languageLabel} />
      </div>
    </header>
  );
}
