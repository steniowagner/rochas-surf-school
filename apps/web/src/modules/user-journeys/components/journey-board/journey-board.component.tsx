"use client";

import { JourneyRow } from "../journey-row";
import { ResultsSummary } from "../results-summary";
import { useJourneyBoard } from "./journey-board.hook";
import type { JourneyBoardProps } from "./journey-board.types";

const headerCellClassName = "ds-text-section-label p-3 text-left text-ink-2";

export function JourneyBoard({ flow, locale, groups, labels, siteName, heading, flowTitle }: JourneyBoardProps) {
  const { progress, counter, copyState, setName, toggleResult, setNote, copyResults, clearResults } = useJourneyBoard({
    flow,
    groups,
    labels,
    siteName,
    heading,
    flowTitle,
  });

  return (
    <div className="flex flex-col gap-[22px]">
      <ResultsSummary
        labels={labels}
        name={progress.name}
        counter={counter}
        copyState={copyState}
        onNameChange={setName}
        onCopy={copyResults}
        onClear={clearResults}
      />
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-3" aria-labelledby={`group-${group.key}`}>
          <h2 id={`group-${group.key}`} className="ds-text-sheet-title text-ink">
            {group.title}
          </h2>
          <table className="block w-full lg:table lg:table-fixed lg:border-separate lg:border-spacing-0 lg:rounded-card lg:border lg:border-line lg:bg-surface">
            <thead className="hidden lg:table-header-group">
              <tr>
                <th scope="col" className={`${headerCellClassName} w-20`}>
                  {labels.id}
                </th>
                <th scope="col" className={`${headerCellClassName} w-40`}>
                  {labels.testCase}
                </th>
                <th scope="col" className={headerCellClassName}>
                  {labels.beforeYouStart}
                </th>
                <th scope="col" className={headerCellClassName}>
                  {labels.steps}
                </th>
                <th scope="col" className={headerCellClassName}>
                  {labels.expectedBehavior}
                </th>
                <th scope="col" className={`${headerCellClassName} w-28`}>
                  {labels.design}
                </th>
                <th scope="col" className={`${headerCellClassName} w-36`}>
                  {labels.result}
                </th>
                <th scope="col" className={`${headerCellClassName} w-56`}>
                  {labels.notes}
                </th>
              </tr>
            </thead>
            <tbody className="flex flex-col gap-3 lg:table-row-group">
              {group.rows.map((row) => (
                <JourneyRow
                  key={row.id}
                  locale={locale}
                  row={row}
                  result={progress.results[row.id]}
                  note={progress.notes[row.id] ?? ""}
                  labels={labels}
                  onToggleResult={toggleResult}
                  onNoteChange={setNote}
                />
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
