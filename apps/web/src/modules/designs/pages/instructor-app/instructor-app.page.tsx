import { InstructorAppClass } from "../../components/instructor-app-class";
import { InstructorAppClasses } from "../../components/instructor-app-classes";
import { InstructorAppHome } from "../../components/instructor-app-home";
import { InstructorAppMore } from "../../components/instructor-app-more";
import { InstructorAppMyClasses } from "../../components/instructor-app-my-classes";
import { InstructorAppOccupancy } from "../../components/instructor-app-occupancy";

import type { InstructorAppPageProps } from "./instructor-app.types";

export function InstructorAppPage({ locale, text, schoolRules }: InstructorAppPageProps) {
  const props = { locale, text };

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="ds-text-section-label text-ink-2">{text.eyebrow}</p>
        {/* "INSTRUTOR" at the wordmark size is wider than a phone column: hyphenate, or break, rather than overflow. */}
        <h1 className="ds-text-wordmark hyphens-auto break-words text-ink">{text.title}</h1>
        <p className="ds-text-body max-w-160 text-ink-2">{text.description}</p>
      </header>
      <InstructorAppHome {...props} />
      <InstructorAppClasses {...props} />
      <InstructorAppClass {...props} />
      <InstructorAppMyClasses {...props} />
      <InstructorAppOccupancy {...props} />
      <InstructorAppMore {...props} schoolRules={schoolRules} />
    </div>
  );
}
