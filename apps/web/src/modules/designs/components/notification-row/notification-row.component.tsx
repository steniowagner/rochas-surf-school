import { AppIcon, type AppIconName } from "../app-icon";

import type { NotificationRowProps, NotificationTone } from "./notification-row.types";

// Spec 055 D-11: one glyph and tone per type.
const icons: Record<string, { name: AppIconName; tone: NotificationTone }> = {
  "registration.approved": { name: "Ionicons:checkmark-circle-outline", tone: "ok" },
  "reactivation.approved": { name: "Ionicons:checkmark-circle-outline", tone: "ok" },
  "class.edited": { name: "Ionicons:create-outline", tone: "info" },
  "class.cancelled": { name: "Ionicons:calendar-outline", tone: "bad" },
  "class.reminder": { name: "Ionicons:time-outline", tone: "warn" },
  "class.message": { name: "Ionicons:chatbubble-outline", tone: "info" },
  "location.changed": { name: "Ionicons:location-outline", tone: "info" },
  "enrolment.expired": { name: "Ionicons:hourglass-outline", tone: "warn" },
  "enrolment.approved": { name: "Ionicons:checkmark-circle-outline", tone: "ok" },
  "enrolment.denied": { name: "Ionicons:close-circle-outline", tone: "bad" },
  "enrolment.enrolled": { name: "Ionicons:person-add-outline", tone: "ok" },
  "enrolment.takenOut": { name: "Ionicons:person-remove-outline", tone: "bad" },
  "role.changed": { name: "Ionicons:shield-checkmark-outline", tone: "info" },
  "account.restored": { name: "Ionicons:person-add-outline", tone: "ok" },
  broadcast: { name: "Ionicons:megaphone-outline", tone: "info" },
};

const tiles: Record<NotificationTone, { tile: string; glyph: string }> = {
  info: { tile: "bg-info-tint", glyph: "text-lagoon" },
  ok: { tile: "bg-ok-tint", glyph: "text-ok" },
  bad: { tile: "bg-bad-tint", glyph: "text-bad" },
  warn: { tile: "bg-warn-tint", glyph: "text-warn" },
};

/** One notification: its tinted icon, title, optional body, when it arrived and, while unread, a dot. */
export function NotificationRow({ type, title, body, time, read }: NotificationRowProps) {
  const icon = icons[type] ?? { name: "Ionicons:notifications-outline", tone: "info" };
  const tone = tiles[icon.tone];

  return (
    <div role="button" className="flex min-h-16 items-start gap-3 rounded-card bg-surface p-4 shadow-card">
      <span data-testid="notification-row-icon" className={`flex size-10 shrink-0 items-center justify-center rounded-full ${tone.tile} ${tone.glyph}`}>
        <AppIcon name={icon.name} size={22} />
      </span>
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="ds-text-list-title text-ink">{title}</p>
        {body ? <p className="ds-text-list-subtitle text-ink-2">{body}</p> : null}
        <p className="ds-text-card-meta text-ink-3">{time}</p>
      </div>
      {read ? null : <span data-testid="notification-row-unread-dot" className="mt-1.5 size-2.5 rounded-full bg-sun" />}
    </div>
  );
}
