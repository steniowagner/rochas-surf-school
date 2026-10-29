import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { Chip } from "../chip";
import { StudentAvatar } from "../student-avatar";

import type { ClassCardProps, EnrolmentChip } from "./class-card.types";

const enrolmentChips: Record<NonNullable<ClassCardProps["enrolment"]>, EnrolmentChip> = {
  pending: { tone: "warn", icon: "Ionicons:hourglass-outline" },
  waitingList: { tone: "info", icon: "Ionicons:list-outline" },
  approved: { tone: "ok", icon: "Ionicons:checkmark-circle-outline" },
  denied: { tone: "bad", icon: "Ionicons:close-circle-outline" },
  withdrawn: { tone: "muted", icon: "Ionicons:arrow-undo-outline" },
  expired: { tone: "muted", icon: "Ionicons:time-outline" },
  cancelled: { tone: "muted", icon: "Ionicons:remove-circle-outline" },
  takenOut: { tone: "bad", icon: "Ionicons:remove-circle-outline" },
};

const fillClasses = { bad: "bg-bad", sun: "bg-sun", lagoon: "bg-lagoon", tan: "bg-tan" } as const;
const MAX_AVATARS = 4;

export function ClassCard({
  locale,
  discipline,
  level,
  state,
  timeRange,
  locationName,
  seatsTaken,
  capacity,
  isNext = false,
  showFlags = false,
  withoutInstructor = false,
  withoutDeadline = false,
  enrolment,
  students,
}: ClassCardProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const next = isNext && state === "notStarted";
  const highlighted = state === "started" || next;
  const full = seatsTaken >= capacity;
  const percent = capacity > 0 ? Math.min(100, Math.round((seatsTaken / capacity) * 100)) : 0;
  const tone = full ? "bad" : percent > 80 ? "sun" : discipline === "surf" ? "lagoon" : "tan";
  const showOccupancy = state !== "finished" && state !== "cancelled";
  const upcoming = state === "notStarted";
  const showFooter = state !== "cancelled";
  const avatars = students.slice(0, MAX_AVATARS);
  const hidden = Math.max(0, seatsTaken - avatars.length);
  const label = seatsTaken === 0 ? "none" : state === "finished" ? "present" : "confirmed";
  const opacity = state === "finished" ? "opacity-55" : state === "cancelled" ? "opacity-78" : "";
  const enrolmentChip = enrolment && upcoming ? enrolmentChips[enrolment] : null;

  return (
    <div
      data-testid="class-card"
      className={`overflow-hidden rounded-card border bg-surface ${highlighted ? "border-sun shadow-primary" : "border-line shadow-card"} ${opacity}`}
    >
      <div className="px-3.5 pb-3.5 pt-3.25">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <Chip tone={discipline === "surf" ? "surf" : "skate"}>{t(`newClass.discipline.${discipline}`)}</Chip>
          <Chip tone="info">{t(`newClass.level.${level}`)}</Chip>
          <div className="ml-auto flex flex-col items-end gap-2">
            {next ? <Chip tone="sun" icon="Ionicons:time-outline">{t("teachingClasses.next")}</Chip> : null}
            {state === "started" ? <Chip tone="sun" icon="Ionicons:time-outline">{t("classesWeek.state.started")}</Chip> : null}
            {state === "finished" ? <Chip tone="muted" icon="Ionicons:checkmark-outline">{t("classesWeek.state.finished")}</Chip> : null}
            {state === "cancelled" ? <Chip tone="bad" icon="Ionicons:close-circle-outline">{t("classesWeek.cancelled")}</Chip> : null}
            {enrolmentChip && enrolment ? (
              <Chip tone={enrolmentChip.tone} icon={enrolmentChip.icon}>{t(`enrolment.status.${enrolment}.chip`)}</Chip>
            ) : null}
            {upcoming && full && !enrolmentChip ? <Chip tone="bad">{t("classesWeek.full")}</Chip> : null}
            {showFlags && upcoming && withoutInstructor ? <Chip tone="warn" icon="Ionicons:person-remove-outline">{t("classesWeek.noInstructor")}</Chip> : null}
            {showFlags && upcoming && withoutDeadline ? <Chip tone="warn" icon="Ionicons:calendar-clear-outline">{t("classesWeek.noDeadline")}</Chip> : null}
          </div>
        </div>
        <p className={`ds-text-lesson-time mb-2.75 ${state === "cancelled" ? "text-ink-2 line-through" : "text-ink"}`}>{timeRange}</p>
        <div className="ds-text-card-meta inline-flex items-center gap-1.75 rounded-full border border-line bg-dim px-3.25 py-1.75 text-ink-2">
          <AppIcon name="Ionicons:location-outline" size={14} />
          {locationName}
        </div>
        {showOccupancy ? (
          <div className="mt-3 flex flex-col gap-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-sand">
              <div data-testid="occupancy-fill" style={{ width: `${percent}%` }} className={`h-full rounded-full ${fillClasses[tone]}`} />
            </div>
            <p className={`ds-text-occupancy ${full ? "text-bad" : "text-ink-2"}`}>{t("classesWeek.occupancy", { taken: seatsTaken, capacity })}</p>
          </div>
        ) : null}
      </div>
      {showFooter ? (
        <div className="flex items-center gap-2.5 border-t border-line bg-dim px-3.5 py-2.5">
          {avatars.length > 0 || hidden > 0 ? (
            <div className="flex items-center">
              {avatars.map((student, index) => (
                <span key={student.id} className={index === 0 ? "" : "-ml-2"}>
                  <StudentAvatar name={student.label} size={28} ringed erased={student.erased} />
                </span>
              ))}
              {hidden > 0 ? <span className="ds-text-chip -ml-2 flex size-7 items-center justify-center rounded-full border-2 border-surface bg-sand text-ink">{`+${hidden}`}</span> : null}
            </div>
          ) : null}
          <p className="ds-text-section-label flex-1 text-ink-2">{t(`classesWeek.students.${label}`, { count: seatsTaken })}</p>
        </div>
      ) : null}
    </div>
  );
}
