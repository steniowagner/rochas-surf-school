import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { Chip } from "../chip";
import { StudentAvatar } from "../student-avatar";

import type { OngoingClassCardProps } from "./ongoing-class-card.types";

const MAX_AVATARS = 4;
// The avatars sit inside a 2-point grape ring, so the ring and the photo make 34 points together.
const AVATAR_SIZE = 30;

/** "Minhas aulas": a class under way, on a grape card, with the content of `ClassCard`. */
export function OngoingClassCard({ locale, discipline, level, timeRange, locationName, seatsTaken, capacity, students }: OngoingClassCardProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const full = seatsTaken >= capacity;
  const percent = capacity > 0 ? Math.min(100, Math.round((seatsTaken / capacity) * 100)) : 0;
  const avatars = students.slice(0, MAX_AVATARS);
  const hidden = Math.max(0, seatsTaken - avatars.length);

  return (
    <div data-testid="ongoing-class-card" className="overflow-hidden rounded-card border border-grape bg-grape shadow-primary">
      <div className="px-3.5 pb-3.5 pt-3.25">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <Chip tone={discipline === "surf" ? "surf" : "skate"}>{t(`newClass.discipline.${discipline}`)}</Chip>
          <Chip tone="onHighlight">{t(`newClass.level.${level}`)}</Chip>
          <div className="ml-auto">
            <Chip tone="onHighlight" icon="Ionicons:time-outline">{t("classesWeek.state.started")}</Chip>
          </div>
        </div>
        <p className="ds-text-lesson-time mb-2.75 text-on-color">{timeRange}</p>
        <div className="ds-text-card-meta inline-flex items-center gap-1.75 rounded-full border border-on-grape-tint bg-on-grape-fill px-3.25 py-1.75 text-on-color">
          <AppIcon name="Ionicons:location-outline" size={14} />
          {locationName}
        </div>
        <div className="mt-3 flex flex-col gap-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-on-grape-track">
            <div data-testid="occupancy-fill" style={{ width: `${percent}%` }} className={`h-full rounded-full ${full ? "bg-bad" : "bg-on-color"}`} />
          </div>
          <p className={`ds-text-occupancy ${full ? "text-on-grape-bad" : "text-on-color"}`}>{t("classesWeek.occupancy", { taken: seatsTaken, capacity })}</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 border-t border-on-grape-tint bg-on-grape-shade px-3.5 py-2.5">
        {avatars.length > 0 || hidden > 0 ? (
          <div className="flex items-center">
            {avatars.map((student, index) => (
              <span key={student.id} className={`rounded-full border-2 border-grape ${index === 0 ? "" : "-ml-2"}`}>
                <StudentAvatar name={student.label} size={AVATAR_SIZE} erased={student.erased} />
              </span>
            ))}
            {hidden > 0 ? <span className="ds-text-chip -ml-2 flex size-8.5 items-center justify-center rounded-full border-2 border-grape bg-sand text-ink">{`+${hidden}`}</span> : null}
          </div>
        ) : null}
        <p className="ds-text-section-label flex-1 text-on-color">{t(`classesWeek.students.${seatsTaken === 0 ? "none" : "confirmed"}`, { count: seatsTaken })}</p>
      </div>
    </div>
  );
}
