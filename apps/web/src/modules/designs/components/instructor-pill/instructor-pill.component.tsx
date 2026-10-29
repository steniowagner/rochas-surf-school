import { StudentAvatar } from "../student-avatar";

import type { InstructorPillProps } from "./instructor-pill.types";

/** One instructor of the class details: avatar and name in a pill that opens their person sheet. */
export function InstructorPill({ name, viewerLabel, erased }: InstructorPillProps) {
  return (
    <span data-testid="instructor-pill" className={`flex min-h-11 items-center gap-2 rounded-full border bg-surface py-1 pl-1 pr-3.5 ${viewerLabel ? "border-lagoon" : "border-line"}`}>
      <StudentAvatar name={name} size={32} erased={erased} />
      <span className="ds-text-list-title truncate text-ink">{viewerLabel ?? name}</span>
    </span>
  );
}
