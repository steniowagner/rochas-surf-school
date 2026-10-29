import { Skeleton } from "../skeleton";

import type { PeopleSkeletonProps } from "./people-skeleton.types";

const rows = [0, 1, 2, 3, 4];

/** Rows shaped like the people of the directory. */
export function PeopleSkeleton(props: PeopleSkeletonProps) {
  void props;

  return (
    <div data-testid="people-skeleton" className="rounded-card border border-line bg-surface">
      {rows.map((key) => (
        <div key={key} className={`flex min-h-16 items-center gap-3 px-4 py-3 ${key === 0 ? "" : "border-t border-line"}`}>
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-1/2 rounded-full" />
            <Skeleton className="h-3 w-1/3 rounded-full" />
          </div>
          <Skeleton className="h-5.5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
