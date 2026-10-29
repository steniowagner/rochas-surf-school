import { adminAppNote } from "@/modules/designs/i18n/admin-app-note";
import { CancellationRulesScreen } from "@/modules/designs/screens/admin/cancellation-rules-screen";
import { ManageSchoolRulesScreen } from "@/modules/designs/screens/admin/manage-school-rules-screen";
import { SchoolSettingsScreen } from "@/modules/designs/screens/admin/school-settings-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { AdminAppSchoolProps } from "./admin-app-school.types";

export function AdminAppSchool({ locale, text, schoolRules }: AdminAppSchoolProps) {
  const frames = [
    { id: "AD-10-01", screen: <SchoolSettingsScreen locale={locale} state="ready" /> },
    { id: "AD-10-02", screen: <SchoolSettingsScreen locale={locale} state="waitingListOff" /> },
    { id: "AD-10-03", screen: <SchoolSettingsScreen locale={locale} state="loading" /> },
    { id: "AD-10-04", screen: <SchoolSettingsScreen locale={locale} state="error" /> },
    { id: "AD-10-05", screen: <CancellationRulesScreen locale={locale} state="surf" surfRule={text.cancellationRules.surf} /> },
    { id: "AD-10-06", screen: <CancellationRulesScreen locale={locale} state="skateEmpty" surfRule={text.cancellationRules.surf} /> },
    { id: "AD-10-07", screen: <CancellationRulesScreen locale={locale} state="loading" surfRule={text.cancellationRules.surf} /> },
    { id: "AD-10-08", screen: <CancellationRulesScreen locale={locale} state="error" surfRule={text.cancellationRules.surf} /> },
    { id: "AD-10-09", screen: <ManageSchoolRulesScreen locale={locale} state="ready" rules={schoolRules} /> },
    { id: "AD-10-10", screen: <ManageSchoolRulesScreen locale={locale} state="addSheet" rules={schoolRules} /> },
    { id: "AD-10-11", screen: <ManageSchoolRulesScreen locale={locale} state="editSheet" rules={schoolRules} /> },
    { id: "AD-10-12", screen: <ManageSchoolRulesScreen locale={locale} state="deleteSheet" rules={schoolRules} /> },
    { id: "AD-10-13", screen: <ManageSchoolRulesScreen locale={locale} state="empty" rules={schoolRules} /> },
    { id: "AD-10-14", screen: <ManageSchoolRulesScreen locale={locale} state="loading" rules={schoolRules} /> },
    { id: "AD-10-15", screen: <ManageSchoolRulesScreen locale={locale} state="error" rules={schoolRules} /> },
  ] as const;

  return (
    <DesignSection number="10" title={text.sections.school.title} description={text.sections.school.description}>
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
