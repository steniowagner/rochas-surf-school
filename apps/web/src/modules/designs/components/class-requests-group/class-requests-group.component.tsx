import { appT } from "@/modules/designs/i18n/app-t";

import { DecisionCard } from "../decision-card";
import { RequestSeatClassCard } from "../request-seat-class-card";
import { StudentAvatar } from "../student-avatar";

import type { ClassRequestsGroupProps } from "./class-requests-group.types";

const FILL_CLASSES = { bad: "bg-bad", sun: "bg-sun", lagoon: "bg-lagoon", tan: "bg-tan" } as const;

/** One upcoming class of the admins' tool: a single card with the class header and occupancy, then its pending requests. */
export function ClassRequestsGroup({ locale, discipline, level, weekday, date, duration, timeRange, locationName, seatsTaken, capacity, requests }: ClassRequestsGroupProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const full = seatsTaken >= capacity;
  const percent = capacity > 0 ? Math.min(100, Math.round((seatsTaken / capacity) * 100)) : 0;
  // The app's `getOccupancyTone`.
  const tone = full ? "bad" : percent > 80 ? "sun" : discipline === "surf" ? "lagoon" : "tan";

  return (
    <div data-testid="class-requests-group" className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div role="button" aria-label={`${t(`newClass.discipline.${discipline}`)}, ${timeRange}`} className="flex flex-col gap-3 bg-dim p-4">
        <RequestSeatClassCard embedded locale={locale} discipline={discipline} level={level} weekday={weekday} date={date} duration={duration} timeRange={timeRange} locationName={locationName} />
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-sand">
            <div data-testid="occupancy-fill" style={{ width: `${percent}%` }} className={`h-full rounded-full ${FILL_CLASSES[tone]}`} />
          </div>
          <div className="flex justify-between">
            <p className="ds-text-occupancy text-ink-2">{t("classRequests.maxStudents", { count: capacity })}</p>
            <p className={`ds-text-occupancy ${full ? "text-bad" : "text-ink-2"}`}>{full ? t("classRequests.full") : t("classRequests.spotsLeft", { count: capacity - seatsTaken })}</p>
          </div>
        </div>
      </div>
      {full ? (
        <div className="flex flex-col gap-1 border-t border-line px-4 py-3">
          <p className="ds-text-section-label text-ink-2">{t("classRequests.waitingList")}</p>
          <p className="ds-text-list-subtitle text-ink-2">{t("classRequests.fullNote")}</p>
        </div>
      ) : null}
      {requests.map((request, index) => (
        <div key={request.id} className="border-t border-line">
          <DecisionCard
            embedded
            pressable
            title={full ? `${t("classRequests.position", { position: index + 1 })} ${request.name}` : request.name}
            details={[t("classRequests.askedAt", request.askedAt)]}
            avatar={<StudentAvatar name={request.name} size={40} />}
            approveLabel={t("classRequests.approve")}
            denyLabel={t("classRequests.deny")}
            approveDisabled={full}
          />
        </div>
      ))}
    </div>
  );
}
