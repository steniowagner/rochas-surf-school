import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon, type AppIconName } from "../app-icon";
import { BottomModal } from "../bottom-modal";
import { Button } from "../button";

import type { AboutSheetProps } from "./about-sheet.types";

const links: { labelKey: string; icon: AppIconName }[] = [
  { labelKey: "about.repository", icon: "Ionicons:logo-github" },
  { labelKey: "about.creatorGithub", icon: "Ionicons:logo-github" },
  { labelKey: "about.creatorLinkedin", icon: "Ionicons:logo-linkedin" },
];

/** The About sheet: the app, its version, the creator and the links that open in the in-app browser. */
export function AboutSheet({ locale }: AboutSheetProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);

  return (
    <BottomModal>
      <div className="mb-4 flex items-center gap-3.5">
        <span className="flex size-14 items-center justify-center rounded-card bg-sun text-on-color">
          <AppIcon name="MaterialCommunityIcons:waves" size={30} />
        </span>
        <div className="flex flex-1 flex-col gap-0.5">
          <h3 className="ds-text-sheet-title text-ink">Rocha&apos;s Surf School</h3>
          <p className="ds-text-list-subtitle text-ink-2">{t("about.version", { version: "0.9 · beta" })}</p>
        </div>
      </div>
      <p className="ds-text-body mb-4 text-ink-2">{t("about.description")}</p>
      <div className="mb-2 flex items-center gap-3 py-2">
        <span className="flex size-11 items-center justify-center rounded-full bg-sand">
          <span className="ds-text-list-title text-grape">SW</span>
        </span>
        <div className="flex flex-1 flex-col">
          <p className="ds-text-list-title text-ink">Stenio Wagner</p>
          <p className="ds-text-list-subtitle text-ink-2">{t("about.creatorRole")}</p>
        </div>
      </div>
      {links.map((link) => (
        <div key={link.labelKey} role="button" aria-label={t(link.labelKey)} className="flex min-h-11 items-center gap-3 border-t border-line py-3">
          <AppIcon name={link.icon} size={20} className="text-lagoon" />
          <p className="ds-text-list-title flex-1 text-ink">{t(link.labelKey)}</p>
          <AppIcon name="Ionicons:open-outline" size={18} className="text-ink-3" />
        </div>
      ))}
      <div className="mt-3">
        <Button variant="ghost" className="w-full">{t("about.close")}</Button>
      </div>
    </BottomModal>
  );
}
