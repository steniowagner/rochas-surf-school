import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";

import type { ClassFullBannerProps } from "./class-full-banner.types";

/** "Turma cheia", with what the student can do about it. */
export function ClassFullBanner({ locale, waitingList }: ClassFullBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-card bg-bad-tint p-4">
      <AppIcon name="Ionicons:people-outline" size={24} className="text-bad" />
      <div className="flex flex-1 flex-col gap-1">
        <p className="ds-text-list-title text-ink">{appT(locale, "classDetails.full.title")}</p>
        <p className="ds-text-list-subtitle text-ink-2">
          {appT(locale, waitingList === "open" ? "classDetails.full.waitingList" : "classDetails.full.waitingListClosed")}
        </p>
      </div>
    </div>
  );
}
