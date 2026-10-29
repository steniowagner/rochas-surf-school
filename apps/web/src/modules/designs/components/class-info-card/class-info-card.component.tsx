import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";

import type { ClassInfoCardProps } from "./class-info-card.types";

/** The status cards of the class details: started, finished, cancelled, and the admin's no-instructor and no-deadline. */
export function ClassInfoCard({ locale, variant, start = "", end = "", message, discipline = "surf" }: ClassInfoCardProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);

  if (variant === "started") {
    return (
      <div data-testid="class-info-card" className="flex flex-col gap-1 rounded-card bg-sun p-4">
        <p className="ds-text-list-title text-on-color">{t("classDetails.started.title")}</p>
        <p className="ds-text-list-subtitle text-on-color">{t("classDetails.started.description", { start, end })}</p>
      </div>
    );
  }

  if (variant === "finished") {
    return (
      <div data-testid="class-info-card" className="flex items-center gap-2 rounded-card bg-dim p-4">
        <div className="flex flex-1 flex-col gap-1">
          <p className="ds-text-list-title text-ink">{t("classDetails.finished.title")}</p>
          <p className="ds-text-list-subtitle text-ink-2">{t("classDetails.finished.description", { end })}</p>
        </div>
      </div>
    );
  }

  const cards = {
    cancelled: {
      background: "bg-bad-tint",
      icon: "Ionicons:close-circle-outline",
      iconClassName: "text-bad",
      title: t("classDetails.cancelled.title"),
      description: message ?? t("classDetails.cancelled.description"),
    },
    noInstructor: {
      background: "bg-warn-tint",
      icon: "Ionicons:person-remove-outline",
      iconClassName: "text-ink",
      title: t("classDetails.noInstructor.title"),
      description: t("classDetails.noInstructor.description"),
    },
    noDeadline: {
      background: "bg-warn-tint",
      icon: "Ionicons:calendar-clear-outline",
      iconClassName: "text-ink",
      title: t("classDetails.noDeadline.title"),
      description: t("classDetails.noDeadline.description", { discipline: t(`cancellationRules.screen.discipline.${discipline}`) }),
    },
  } as const;
  const card = cards[variant];

  return (
    <div data-testid="class-info-card" className={`flex min-h-11 items-center gap-3 rounded-card p-4 ${card.background}`}>
      <AppIcon name={card.icon} size={24} className={card.iconClassName} />
      <div className="flex flex-1 flex-col gap-1">
        <p className="ds-text-list-title text-ink">{card.title}</p>
        <p className="ds-text-list-subtitle text-ink-2">{card.description}</p>
      </div>
    </div>
  );
}
