import { adminHome } from "@/modules/designs/data/fortaleza";
import { adminAppNote } from "@/modules/designs/i18n/admin-app-note";
import { ClassHistoryScreen } from "@/modules/designs/screens/shared/class-history-screen";
import { EditProfileScreen } from "@/modules/designs/screens/shared/edit-profile-screen";
import { NotificationsScreen } from "@/modules/designs/screens/shared/notifications-screen";
import { ProfileScreen } from "@/modules/designs/screens/shared/profile-screen";
import { ProfileWhatsappScreen } from "@/modules/designs/screens/shared/profile-whatsapp-screen";
import { SchoolRulesReadScreen } from "@/modules/designs/screens/shared/school-rules-read-screen";
import { TeachingClassesScreen } from "@/modules/designs/screens/shared/teaching-classes-screen";
import { WeeklyOccupancyScreen } from "@/modules/designs/screens/shared/weekly-occupancy-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { AdminAppMoreProps } from "./admin-app-more.types";

// The newest rows are unread, as many as the home's bell counts.
const UNREAD_NOTIFICATIONS = adminHome.unreadNotifications;

export function AdminAppMore({ locale, text, schoolRules }: AdminAppMoreProps) {
  const items = text.notifications.map((item, index) => ({ ...item, read: index >= UNREAD_NOTIFICATIONS }));
  const frames = [
    { id: "AD-11-01", screen: <TeachingClassesScreen locale={locale} state="list" /> },
    { id: "AD-11-02", screen: <ClassHistoryScreen locale={locale} state="month" role="instructor" /> },
    { id: "AD-11-03", screen: <WeeklyOccupancyScreen locale={locale} state="week" /> },
    { id: "AD-11-04", screen: <ProfileScreen locale={locale} state="profile" rules={text.cancellationRules} role="admin" /> },
    { id: "AD-11-05", screen: <EditProfileScreen locale={locale} state="idle" role="admin" /> },
    { id: "AD-11-06", screen: <ProfileWhatsappScreen locale={locale} state="idle" /> },
    { id: "AD-11-07", screen: <SchoolRulesReadScreen locale={locale} state="ready" rules={schoolRules} /> },
    { id: "AD-11-08", screen: <NotificationsScreen locale={locale} state="list" items={items} /> },
  ] as const;

  return (
    <DesignSection number="11" title={text.sections.more.title} description={text.sections.more.description}>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {frames.map(({ id, screen }) => (
          <DesignEntry key={id} id={id} title={text.entries[id].title} note={adminAppNote(locale, text, id)}>
            {screen}
          </DesignEntry>
        ))}
      </div>
    </DesignSection>
  );
}
