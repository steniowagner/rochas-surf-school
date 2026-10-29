import { appT } from "@/modules/designs/i18n/app-t";

import { Skeleton } from "../skeleton";

import type { EnrolStudentStudentsSkeletonProps } from "./enrol-student-students-skeleton.types";

const LOADING_ROWS = [0, 1, 2, 3];

/** Rows shaped like the students to pick from, read out as one loading state. */
export function EnrolStudentStudentsSkeleton({ locale }: EnrolStudentStudentsSkeletonProps) {
  return (
    <div role="status" aria-label={appT(locale, "enrolStudent.students.loading")} className="rounded-card border border-line bg-surface">
      {LOADING_ROWS.map((key) => (
        <div key={key} className={`flex min-h-14 items-center gap-3 px-4 py-2 ${key === 0 ? "" : "border-t border-line"}`}>
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-3.5 flex-1 rounded-full" />
          <Skeleton className="size-5.5 rounded-full" />
        </div>
      ))}
    </div>
  );
}
