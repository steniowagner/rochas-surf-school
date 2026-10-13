import { usePathname } from "next/navigation";

import { locales } from "@/i18n/locales";

import type { LanguageOption, UseLanguagePickerProps } from "./language-picker.types";

/** Each language's link to the page being shown: the same path with the first segment swapped. */
export const useLanguagePicker = ({ locale }: UseLanguagePickerProps) => {
  const pathname = usePathname();
  const rest = pathname.startsWith(`/${locale}`) ? pathname.slice(locale.length + 1) : "";

  const options: LanguageOption[] = locales.map((option) => ({
    locale: option,
    href: `/${option}${rest}`,
  }));

  return { options };
};
