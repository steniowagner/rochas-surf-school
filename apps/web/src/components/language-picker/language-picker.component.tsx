"use client";

import { Check, ChevronDown } from "lucide-react";

import { localeAcronyms, localeFlags, localeNames } from "@/i18n/locales";

import { useLanguagePicker } from "./language-picker.hook";
import type { LanguagePickerProps } from "./language-picker.types";

export function LanguagePicker({ locale, label }: LanguagePickerProps) {
  const { options } = useLanguagePicker({ locale });

  return (
    <details className="group relative">
      <summary
        aria-label={`${label}: ${localeNames[locale]}`}
        className="ds-text-chip flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-input-line bg-surface px-4 text-ink [&::-webkit-details-marker]:hidden"
      >
        <span aria-hidden>{localeFlags[locale]}</span>
        <span>{localeAcronyms[locale]}</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className="transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <ul className="absolute right-0 top-full z-10 mt-2 flex w-56 flex-col gap-1 rounded-card border border-line bg-surface p-2 shadow-card">
        {options.map((option) => (
          <li key={option.locale}>
            <a
              href={option.href}
              hrefLang={option.locale}
              aria-current={option.locale === locale ? "page" : undefined}
              className="ds-text-list-title flex min-h-11 items-center gap-3 rounded-control px-3 text-ink"
            >
              <span aria-hidden>{localeFlags[option.locale]}</span>
              <span className="flex-1">{localeNames[option.locale]}</span>
              {option.locale === locale ? (
                <Check size={18} strokeWidth={2} className="text-grape" aria-hidden />
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
