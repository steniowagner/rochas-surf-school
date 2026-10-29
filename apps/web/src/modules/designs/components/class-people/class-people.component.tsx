import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { ClassGuestRow } from "../class-guest-row";
import { ClassStudentRow } from "../class-student-row";
import { GuestAvatar } from "../guest-avatar";
import { StudentAvatar } from "../student-avatar";

import type { ClassPeopleProps } from "./class-people.types";

const MAX_AVATARS = 5;
const AVATAR_SIZE = 30;

/** The "A aula" group of the class details: who teaches, who is enrolled, and how many seats are left. */
export function ClassPeople({ locale, instructors, students, guests = [], seatsTaken, capacity, state, expanded = false, showTrialCount = false, canTakeOut = false }: ClassPeopleProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  // The first seats, students first and then guests; "+N" counts the others.
  const shown = [...students.map((student) => ({ kind: "student" as const, ...student })), ...guests.map((guest) => ({ kind: "guest" as const, id: guest.id }))].slice(0, MAX_AVATARS);
  const hidden = Math.max(0, seatsTaken - shown.length);
  const full = seatsTaken >= capacity;
  const showCapacityLine = state !== "finished" && state !== "cancelled";
  const labelKey = seatsTaken === 0 ? "none" : state === "finished" ? "present" : "confirmed";
  const canExpand = students.length > 0 || guests.length > 0;
  const trialCount = showTrialCount && guests.length > 0 ? ` · ${t("classDetails.includesTrial", { count: guests.length })}` : "";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <p className="ds-text-section-label text-ink-2">{t("classDetails.theClass")}</p>
        {showCapacityLine ? (
          <p className={`ds-text-section-label text-right ${full ? "text-bad" : "text-ink-2"}`}>
            {`${t("classDetails.capacity", { count: capacity })} · ${full ? t("classDetails.soldOut") : t("classDetails.spotsLeft", { count: capacity - seatsTaken })}${trialCount}`}
          </p>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <div className="flex flex-col gap-2 bg-dim px-3.5 py-3">
          <p className="ds-text-section-label text-ink-2">{t("classDetails.instructor", { count: instructors.length })}</p>
          {instructors.length === 0 ? (
            <p className="ds-text-list-title text-ink">{t("classDetails.noInstructorAssigned")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {instructors.map((instructor) => (
                <span
                  key={instructor.id}
                  data-testid="instructor-pill"
                  className={`flex min-h-11 items-center gap-2 rounded-full border bg-surface py-1 pl-1 pr-3.5 ${instructor.isViewer ? "border-lagoon" : "border-line"}`}
                >
                  <StudentAvatar name={instructor.name} size={32} erased={instructor.erased} />
                  <span className="ds-text-list-title truncate text-ink">{instructor.isViewer ? t("classDetails.you") : instructor.name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex min-h-11 items-center gap-3 border-t border-line px-4 py-3">
          {shown.length > 0 || hidden > 0 ? (
            <div className="flex items-center">
              {shown.map((seat, index) => (
                <span key={seat.id} className={index === 0 ? "" : "-ml-2"}>
                  {seat.kind === "student" ? <StudentAvatar name={seat.label} size={AVATAR_SIZE} ringed erased={seat.erased} /> : <GuestAvatar locale={locale} size={AVATAR_SIZE} ringed />}
                </span>
              ))}
              {hidden > 0 ? <span className="ds-text-chip -ml-2 flex size-7.5 items-center justify-center rounded-full border-2 border-surface bg-sand text-ink">{`+${hidden}`}</span> : null}
            </div>
          ) : null}
          <p className="ds-text-section-label flex-1 text-ink-2">{t(`classesWeek.students.${labelKey}`, { count: seatsTaken })}</p>
          {canExpand ? <AppIcon name={expanded ? "Ionicons:chevron-up" : "Ionicons:chevron-down"} size={18} className="text-ink-2" /> : null}
        </div>
        {expanded ? students.map((student) => <ClassStudentRow key={student.id} name={student.label} erased={student.erased} takeOutLabel={canTakeOut ? t("takeOutSheet.action") : undefined} />) : null}
        {expanded ? guests.map((guest) => <ClassGuestRow key={guest.id} locale={locale} name={guest.name} takeOut={canTakeOut} />) : null}
      </div>
    </div>
  );
}
