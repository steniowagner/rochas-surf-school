import { AdminAppAccounts } from "../../components/admin-app-accounts";
import { AdminAppClass } from "../../components/admin-app-class";
import { AdminAppClassForms } from "../../components/admin-app-class-forms";
import { AdminAppClassRequests } from "../../components/admin-app-class-requests";
import { AdminAppClasses } from "../../components/admin-app-classes";
import { AdminAppEnrolStudent } from "../../components/admin-app-enrol-student";
import { AdminAppHome } from "../../components/admin-app-home";
import { AdminAppMore } from "../../components/admin-app-more";
import { AdminAppNotices } from "../../components/admin-app-notices";
import { AdminAppPeople } from "../../components/admin-app-people";
import { AdminAppSchool } from "../../components/admin-app-school";

import type { AdminAppPageProps } from "./admin-app.types";

export function AdminAppPage({ locale, text, schoolRules }: AdminAppPageProps) {
  const props = { locale, text };

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="ds-text-section-label text-ink-2">{text.eyebrow}</p>
        {/* The wordmark size can be wider than a phone column: hyphenate, or break, rather than overflow. */}
        <h1 className="ds-text-wordmark hyphens-auto break-words text-ink">{text.title}</h1>
        <p className="ds-text-body max-w-160 text-ink-2">{text.description}</p>
      </header>
      <AdminAppHome {...props} />
      <AdminAppClasses {...props} />
      <AdminAppClass {...props} />
      <AdminAppClassForms {...props} />
      <AdminAppNotices {...props} />
      <AdminAppClassRequests {...props} />
      <AdminAppAccounts {...props} />
      <AdminAppEnrolStudent {...props} />
      <AdminAppPeople {...props} />
      <AdminAppSchool {...props} schoolRules={schoolRules} />
      <AdminAppMore {...props} schoolRules={schoolRules} />
    </div>
  );
}
