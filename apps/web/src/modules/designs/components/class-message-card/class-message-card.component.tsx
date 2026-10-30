import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { Chip } from "../chip";
import { ClassSummaryCard } from "../class-summary-card";
import { GuestAvatar } from "../guest-avatar";
import { StudentAvatar } from "../student-avatar";

import { ROLE_TONE } from "./class-message-card.constants";
import type { ClassMessageCardProps } from "./class-message-card.types";

const STACK_AVATARS = 3;

/**
 * The class a message goes to and the people who receive it: the class in short, then a row with "N pessoas recebem" and who they are, which opens the list of the people.
 */
export function ClassMessageCard({ locale, discipline, level, dateLabel, timeRange, locationName, people, expanded = false }: ClassMessageCardProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const stacked = people.slice(0, STACK_AVATARS);
  const counts = { instructor: 0, student: 0, pending: 0 };
  for (const person of people) {
    counts[person.role] += 1;
  }
  // The app's summary: each group that has someone, "1 instrutor · 4 alunos · 1 pedido pendente".
  const summary = [
    counts.instructor > 0 ? t("notices.classMessage.summary.instructors", { count: counts.instructor }) : null,
    counts.student > 0 ? t("notices.classMessage.summary.students", { count: counts.student }) : null,
    counts.pending > 0 ? t("notices.classMessage.summary.pending", { count: counts.pending }) : null,
  ]
    .filter((part) => part !== null)
    .join(" · ");

  return (
    <div data-testid="class-message-card" className="overflow-hidden rounded-card bg-surface shadow-card">
      <div className="px-3.5 pb-3.5 pt-3.25">
        <ClassSummaryCard locale={locale} embedded discipline={discipline} level={level} dateLabel={dateLabel} timeRange={timeRange} locationName={locationName} />
      </div>
      <div className="border-t border-line">
        <div role="button" aria-expanded={expanded} className="flex min-h-11 items-center gap-3 px-4 py-3">
          {stacked.length > 0 ? (
            <div className="flex items-center">
              {stacked.map((person, index) => (
                <span key={person.id} className={index === 0 ? "" : "-ml-2"}>
                  {person.erased ? <GuestAvatar locale={locale} size={32} ringed /> : <StudentAvatar name={person.label} size={32} ringed />}
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex flex-1 flex-col gap-0.5">
            <p className="ds-text-list-title text-ink">{t("notices.classMessage.receive", { count: people.length })}</p>
            {summary !== "" ? <p className="ds-text-list-subtitle text-ink-2">{summary}</p> : null}
          </div>
          {people.length > 0 ? <AppIcon name={expanded ? "Ionicons:chevron-up" : "Ionicons:chevron-down"} size={18} className="text-ink-2" /> : null}
        </div>
        {expanded
          ? people.map((person) => (
              <div key={person.id} role={person.erased ? undefined : "button"} aria-label={person.label} className="flex min-h-11 items-center gap-3 border-t border-line px-4 py-3">
                {person.erased ? <GuestAvatar locale={locale} size={40} /> : <StudentAvatar name={person.label} size={40} />}
                <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                  <p className="ds-text-list-title truncate text-ink">{person.label}</p>
                  <Chip tone={ROLE_TONE[person.role]} size="compact">
                    {t(`notices.classMessage.roles.${person.role}`)}
                  </Chip>
                </div>
                {person.erased ? null : <AppIcon name="Ionicons:chevron-forward" size={17} className="text-ink-3" />}
              </div>
            ))
          : null}
      </div>
    </div>
  );
}
