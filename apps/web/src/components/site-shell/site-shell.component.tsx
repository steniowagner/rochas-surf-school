import { SiteHeader } from "@/components/site-header";
import { getDictionary } from "@/i18n/get-dictionary";

import type { SiteShellProps } from "./site-shell.types";

const widthClassName = {
  narrow: "max-w-160",
  wide: "max-w-360",
} as const;

export async function SiteShell({ locale, width, children }: SiteShellProps) {
  const dictionary = await getDictionary(locale);

  return (
    <div className={`mx-auto flex min-h-screen w-full flex-col px-5 ${widthClassName[width]}`}>
      <SiteHeader
        locale={locale}
        homeLabel={dictionary.header.homeLabel}
        languageLabel={dictionary.header.languageLabel}
        themeLabel={dictionary.header.themeLabel}
      />
      <main className="flex flex-1 flex-col gap-[22px] pb-8 pt-2">{children}</main>
      <footer className="ds-text-list-subtitle py-6 text-center text-ink-2">
        {dictionary.footer.text}
      </footer>
    </div>
  );
}
