import { studentAppNote } from "@/modules/designs/i18n/student-app-note";
import { EditProfileScreen } from "@/modules/designs/screens/shared/edit-profile-screen";
import { ProfileScreen } from "@/modules/designs/screens/shared/profile-screen";
import { ProfileWhatsappScreen } from "@/modules/designs/screens/shared/profile-whatsapp-screen";
import { SchoolRulesReadScreen } from "@/modules/designs/screens/shared/school-rules-read-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { StudentAppProfileProps } from "./student-app-profile.types";

export function StudentAppProfile({ locale, text, schoolRules }: StudentAppProfileProps) {
  const frames = [
    { id: "ST-05-01", screen: <ProfileScreen locale={locale} state="profile" rules={text.cancellationRules} /> },
    { id: "ST-05-02", screen: <ProfileScreen locale={locale} state="pushDenied" rules={text.cancellationRules} /> },
    { id: "ST-05-03", screen: <ProfileScreen locale={locale} state="languageSheet" rules={text.cancellationRules} /> },
    { id: "ST-05-04", screen: <ProfileScreen locale={locale} state="themeSheet" rules={text.cancellationRules} /> },
    { id: "ST-05-05", screen: <ProfileScreen locale={locale} state="aboutSheet" rules={text.cancellationRules} /> },
    { id: "ST-05-06", screen: <ProfileScreen locale={locale} state="signOutSheet" rules={text.cancellationRules} /> },
    { id: "ST-05-07", screen: <ProfileScreen locale={locale} state="deleteSheet" rules={text.cancellationRules} /> },
    { id: "ST-05-08", screen: <ProfileScreen locale={locale} state="removing" rules={text.cancellationRules} /> },
    { id: "ST-05-09", screen: <ProfileScreen locale={locale} state="rules" rules={text.cancellationRules} /> },
    { id: "ST-05-10", screen: <ProfileScreen locale={locale} state="rulesLoading" rules={text.cancellationRules} /> },
    { id: "ST-05-11", screen: <ProfileScreen locale={locale} state="rulesEmpty" rules={text.cancellationRules} /> },
    { id: "ST-05-12", screen: <ProfileScreen locale={locale} state="rulesError" rules={text.cancellationRules} /> },
    { id: "ST-05-13", screen: <EditProfileScreen locale={locale} state="idle" /> },
    { id: "ST-05-14", screen: <EditProfileScreen locale={locale} state="invalidName" /> },
    { id: "ST-05-15", screen: <EditProfileScreen locale={locale} state="saving" /> },
    { id: "ST-05-16", screen: <ProfileWhatsappScreen locale={locale} state="idle" /> },
    { id: "ST-05-17", screen: <ProfileWhatsappScreen locale={locale} state="invalidNumber" /> },
    { id: "ST-05-18", screen: <ProfileWhatsappScreen locale={locale} state="saving" /> },
    { id: "ST-05-19", screen: <SchoolRulesReadScreen locale={locale} state="ready" rules={schoolRules} /> },
    { id: "ST-05-20", screen: <SchoolRulesReadScreen locale={locale} state="loading" rules={schoolRules} /> },
    { id: "ST-05-21", screen: <SchoolRulesReadScreen locale={locale} state="empty" rules={schoolRules} /> },
    { id: "ST-05-22", screen: <SchoolRulesReadScreen locale={locale} state="error" rules={schoolRules} /> },
  ] as const;

  return (
    <DesignSection number="05" title={text.sections.profile.title} description={text.sections.profile.description}>
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
