import type { JourneyCounts, JourneyProgress } from "../types/journey-progress.types";

export type ResultsSummaryLabels = {
  approved: string;
  denied: string;
  notTested: string;
  tester: string;
  date: string;
  /** `{approved} approved · {denied} denied · {notTested} not tested`, in the page's language. */
  counter: string;
};

export type ResultsSummaryInput = {
  siteName: string;
  /** "User journeys", in the page's language. */
  heading: string;
  flowTitle: string;
  labels: ResultsSummaryLabels;
  rows: readonly { id: string; title: string }[];
  progress: JourneyProgress;
  /** The browser's local date, `YYYY-MM-DD`. */
  date: string;
};

/** How many of the rows are approved, denied and not tested. */
export const countResults = (rowIds: readonly string[], results: JourneyProgress["results"]): JourneyCounts => {
  const approved = rowIds.filter((id) => results[id] === "approved").length;
  const denied = rowIds.filter((id) => results[id] === "denied").length;

  return { approved, denied, notTested: rowIds.length - approved - denied };
};

/** The counter line: the template with its three counts filled in. */
export const formatCounter = (template: string, counts: JourneyCounts): string =>
  template
    .replace("{approved}", String(counts.approved))
    .replace("{denied}", String(counts.denied))
    .replace("{notTested}", String(counts.notTested));

/** A date as `YYYY-MM-DD` in the browser's time zone. */
export const formatLocalDate = (date: Date): string =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((part) => String(part).padStart(2, "0")).join("-");

/** The text "Copy results" puts on the clipboard (D-15). */
export const buildResultsSummary = ({
  siteName,
  heading,
  flowTitle,
  labels,
  rows,
  progress,
  date,
}: ResultsSummaryInput): string => {
  const counts = countResults(
    rows.map((row) => row.id),
    progress.results,
  );
  const resultLabel = { approved: labels.approved, denied: labels.denied };
  const rowLines = rows.map((row) => {
    const result = progress.results[row.id];
    const note = progress.notes[row.id]?.trim();
    const line = `${row.id} — ${row.title}: ${result ? resultLabel[result] : labels.notTested}`;

    return note ? `${line} — ${note}` : line;
  });

  return [
    `${siteName} — ${heading}: ${flowTitle}`,
    `${labels.tester}: ${progress.name.trim() || "—"}`,
    `${labels.date}: ${date}`,
    formatCounter(labels.counter, counts),
    "",
    ...rowLines,
  ].join("\n");
};
