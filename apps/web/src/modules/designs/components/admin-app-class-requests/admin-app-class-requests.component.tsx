import { adminAppNote } from "@/modules/designs/i18n/admin-app-note";
import { ClassRequestsScreen } from "@/modules/designs/screens/admin/class-requests-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { AdminAppClassRequestsProps } from "./admin-app-class-requests.types";

export function AdminAppClassRequests({ locale, text }: AdminAppClassRequestsProps) {
  const frames = [
    { id: "AD-06-01", screen: <ClassRequestsScreen locale={locale} state="ready" /> },
    { id: "AD-06-02", screen: <ClassRequestsScreen locale={locale} state="fullClass" /> },
    { id: "AD-06-03", screen: <ClassRequestsScreen locale={locale} state="filtered" /> },
    { id: "AD-06-04", screen: <ClassRequestsScreen locale={locale} state="denySheet" /> },
    { id: "AD-06-05", screen: <ClassRequestsScreen locale={locale} state="approved" /> },
    { id: "AD-06-06", screen: <ClassRequestsScreen locale={locale} state="empty" /> },
    { id: "AD-06-07", screen: <ClassRequestsScreen locale={locale} state="emptyFiltered" /> },
    { id: "AD-06-08", screen: <ClassRequestsScreen locale={locale} state="loading" /> },
    { id: "AD-06-09", screen: <ClassRequestsScreen locale={locale} state="error" /> },
  ] as const;

  return (
    <DesignSection number="06" title={text.sections.classRequests.title} description={text.sections.classRequests.description}>
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
