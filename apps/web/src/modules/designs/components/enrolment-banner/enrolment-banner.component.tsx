import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon, type AppIconName } from "../app-icon";

import type { EnrolmentBannerProps } from "./enrolment-banner.types";

const displays: Record<EnrolmentBannerProps["status"], { background: string; icon: AppIconName; iconClassName: string }> = {
  pending: { background: "bg-warn-tint", icon: "Ionicons:hourglass-outline", iconClassName: "text-ink" },
  waitingList: { background: "bg-info-tint", icon: "Ionicons:list-outline", iconClassName: "text-ink" },
  approved: { background: "bg-ok-tint", icon: "Ionicons:checkmark-circle-outline", iconClassName: "text-ok" },
  denied: { background: "bg-bad-tint", icon: "Ionicons:close-circle-outline", iconClassName: "text-bad" },
  withdrawn: { background: "bg-dim", icon: "Ionicons:arrow-undo-outline", iconClassName: "text-ink" },
  expired: { background: "bg-dim", icon: "Ionicons:time-outline", iconClassName: "text-ink" },
  cancelled: { background: "bg-dim", icon: "Ionicons:remove-circle-outline", iconClassName: "text-ink" },
  takenOut: { background: "bg-bad-tint", icon: "Ionicons:remove-circle-outline", iconClassName: "text-bad" },
};

/** The student's enrolment on the class details: a tinted banner with its glyph, title and description. */
export function EnrolmentBanner({ locale, status, reason, pressable = false }: EnrolmentBannerProps) {
  const display = displays[status];
  const description =
    status !== "takenOut"
      ? appT(locale, `enrolment.status.${status}.description`)
      : reason
        ? appT(locale, "enrolment.status.takenOut.reason", { reason })
        : appT(locale, "enrolment.status.takenOut.noReason");

  return (
    <div
      data-testid="enrolment-banner"
      role={pressable ? "button" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-card p-4 ${display.background}`}
    >
      <AppIcon name={display.icon} size={24} className={display.iconClassName} />
      <div className="flex flex-1 flex-col gap-1">
        <p className="ds-text-list-title text-ink">{appT(locale, `enrolment.status.${status}.title`)}</p>
        <p className="ds-text-list-subtitle text-ink-2">{description}</p>
      </div>
    </div>
  );
}
