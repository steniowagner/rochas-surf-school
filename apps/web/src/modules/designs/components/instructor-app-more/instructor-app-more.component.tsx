import { instructorHome } from "@/modules/designs/data/fortaleza";
import { instructorAppNote } from "@/modules/designs/i18n/instructor-app-note";
import { EditProfileScreen } from "@/modules/designs/screens/shared/edit-profile-screen";
import { NotificationsScreen } from "@/modules/designs/screens/shared/notifications-screen";
import { PeopleScreen } from "@/modules/designs/screens/shared/people-screen";
import { ProfileScreen } from "@/modules/designs/screens/shared/profile-screen";
import { ProfileWhatsappScreen } from "@/modules/designs/screens/shared/profile-whatsapp-screen";
import { SchoolRulesReadScreen } from "@/modules/designs/screens/shared/school-rules-read-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { InstructorAppMoreProps } from "./instructor-app-more.types";

// The newest rows are unread, as many as the home's bell counts.
const UNREAD_NOTIFICATIONS = instructorHome.unreadNotifications;

export function InstructorAppMore({ locale, text, schoolRules }: InstructorAppMoreProps) {
  const items = text.notifications.map((item, index) => ({ ...item, read: index >= UNREAD_NOTIFICATIONS }));
  const frames = [
    { id: "IN-06-01", screen: <PeopleScreen locale={locale} state="list" role="instructor" /> },
    { id: "IN-06-02", screen: <ProfileScreen locale={locale} state="profile" rules={text.cancellationRules} role="instructor" /> },
    { id: "IN-06-03", screen: <EditProfileScreen locale={locale} state="idle" role="instructor" /> },
    { id: "IN-06-04", screen: <ProfileWhatsappScreen locale={locale} state="idle" /> },
    { id: "IN-06-05", screen: <SchoolRulesReadScreen locale={locale} state="ready" rules={schoolRules} /> },
    { id: "IN-06-06", screen: <NotificationsScreen locale={locale} state="list" items={items} /> },
  ] as const;

  return (
    <DesignSection number="06" title={text.sections.more.title} description={text.sections.more.description}>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {frames.map(({ id, screen }) => (
          <DesignEntry key={id} id={id} title={text.entries[id].title} note={instructorAppNote(locale, text, id)}>
            {screen}
          </DesignEntry>
        ))}
      </div>
    </DesignSection>
  );
}
