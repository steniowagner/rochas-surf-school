import { StudentAppAgenda } from "../../components/student-app-agenda";
import { StudentAppClass } from "../../components/student-app-class";
import { StudentAppMyClasses } from "../../components/student-app-my-classes";
import { StudentAppNotifications } from "../../components/student-app-notifications";
import { StudentAppProfile } from "../../components/student-app-profile";
import { StudentAppSchool } from "../../components/student-app-school";

import type { StudentAppPageProps } from "./student-app.types";

export function StudentAppPage({ locale, text, schoolRules }: StudentAppPageProps) {
  const props = { locale, text };

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="ds-text-section-label text-ink-2">{text.eyebrow}</p>
        <h1 className="ds-text-wordmark text-ink">{text.title}</h1>
        <p className="ds-text-body max-w-160 text-ink-2">{text.description}</p>
      </header>
      <StudentAppAgenda {...props} />
      <StudentAppClass {...props} />
      <StudentAppMyClasses {...props} />
      <StudentAppSchool {...props} />
      <StudentAppProfile {...props} schoolRules={schoolRules} />
      <StudentAppNotifications {...props} />
    </div>
  );
}
