import { adminAppNote } from "@/modules/designs/i18n/admin-app-note";
import { HomeScreen } from "@/modules/designs/screens/admin/home-screen";
import { SendNoticeScreen } from "@/modules/designs/screens/admin/send-notice-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { AdminAppNoticesProps } from "./admin-app-notices.types";

// AD-05-04: the notice sent; the screen went back to the home that opened it.
const NOTICE_SENT = { key: "notices.sent" };

export function AdminAppNotices({ locale, text }: AdminAppNoticesProps) {
  const frames = [
    { id: "AD-05-01", screen: <SendNoticeScreen locale={locale} state="empty" notice={text.notice} /> },
    { id: "AD-05-02", screen: <SendNoticeScreen locale={locale} state="filled" notice={text.notice} /> },
    { id: "AD-05-03", screen: <SendNoticeScreen locale={locale} state="confirm" notice={text.notice} /> },
    { id: "AD-05-04", screen: <HomeScreen locale={locale} state="home" toast={NOTICE_SENT} /> },
    { id: "AD-05-05", screen: <SendNoticeScreen locale={locale} state="classMessage" notice={text.notice} /> },
    { id: "AD-05-06", screen: <SendNoticeScreen locale={locale} state="classConfirm" notice={text.notice} /> },
  ] as const;

  return (
    <DesignSection number="05" title={text.sections.notices.title} description={text.sections.notices.description}>
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
