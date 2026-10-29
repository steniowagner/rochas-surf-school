import type { JourneyProgress, JourneyResult } from "../types/journey-progress.types";

const STORAGE_VERSION = 1;

/** The `localStorage` key of a flow's progress (D-16): no language, so every language of a flow shares it. */
export const progressStorageKey = (flow: string): string => `rochas-surf-school:user-journeys:${flow}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isResult = (value: unknown): value is JourneyResult => value === "approved" || value === "denied";

/**
 * The flow's saved progress, or `null` when there is none or it can't be used: unparsable, of another version or
 * not the D-16 shape. Results and notes of rows the flow doesn't have are dropped. Never throws.
 */
export const readProgress = (flow: string, rowIds: readonly string[]): JourneyProgress | null => {
  let parsed: unknown;

  try {
    const raw = localStorage.getItem(progressStorageKey(flow));

    if (raw === null) {
      return null;
    }

    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION) {
    return null;
  }

  const known = new Set(rowIds);
  const results: JourneyProgress["results"] = {};
  const notes: JourneyProgress["notes"] = {};

  if (isRecord(parsed.results)) {
    for (const [id, result] of Object.entries(parsed.results)) {
      if (known.has(id) && isResult(result)) {
        results[id] = result;
      }
    }
  }

  if (isRecord(parsed.notes)) {
    for (const [id, note] of Object.entries(parsed.notes)) {
      if (known.has(id) && typeof note === "string") {
        notes[id] = note;
      }
    }
  }

  return { name: typeof parsed.name === "string" ? parsed.name : "", results, notes };
};

/** Saves the flow's progress. A storage that throws (blocked or full) is ignored: the page keeps it in memory. */
export const writeProgress = (flow: string, progress: JourneyProgress): void => {
  try {
    localStorage.setItem(progressStorageKey(flow), JSON.stringify({ version: STORAGE_VERSION, ...progress }));
  } catch {
    // Storage unavailable: the progress stays in memory for this visit.
  }
};

/** Forgets the flow's progress. A storage that throws is ignored. */
export const removeProgress = (flow: string): void => {
  try {
    localStorage.removeItem(progressStorageKey(flow));
  } catch {
    // Storage unavailable: nothing was saved there.
  }
};
