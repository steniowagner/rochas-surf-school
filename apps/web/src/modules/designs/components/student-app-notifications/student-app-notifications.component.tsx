import { studentAppNote } from "@/modules/designs/i18n/student-app-note";
import { NotificationsScreen } from "@/modules/designs/screens/shared/notifications-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { StudentAppNotificationsProps } from "./student-app-notifications.types";

export function StudentAppNotifications({ locale, text }: StudentAppNotificationsProps) {
  const items = text.notifications.map((item, index) => ({ type: item.type, title: item.title, body: item.bodyFrom ? text[item.bodyFrom] : item.body, time: item.time, read: index >= 5 }));
  const frames = [
    { id: "ST-06-01", screen: <NotificationsScreen locale={locale} state="list" items={items} /> },
    { id: "ST-06-02", screen: <NotificationsScreen locale={locale} state="loading" items={items} /> },
    { id: "ST-06-03", screen: <NotificationsScreen locale={locale} state="empty" items={items} /> },
    { id: "ST-06-04", screen: <NotificationsScreen locale={locale} state="error" items={items} /> },
    { id: "ST-06-05", screen: <NotificationsScreen locale={locale} state="markAllFailed" items={items} /> },
  ] as const;

  return (
    <DesignSection number="06" title={text.sections.notifications.title} description={text.sections.notifications.description}>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {frames.map(({ id, screen }) => (
          <DesignEntry key={id} id={id} title={text.entries[id].title} note={studentAppNote(locale, text, id)}>
            {screen}
          </DesignEntry>
        ))}
      </div>
    </DesignSection>
  );
}
