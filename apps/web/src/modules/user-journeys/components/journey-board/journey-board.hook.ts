import { useEffect, useState, useSyncExternalStore } from "react";

import type { JourneyProgress, JourneyResult } from "../../types/journey-progress.types";
import { readProgress, removeProgress, writeProgress } from "../../utils/journey-progress-storage";
import { buildResultsSummary, countResults, formatCounter, formatLocalDate } from "../../utils/results-summary";
import type { CopyState } from "../results-summary/results-summary.types";
import type { UseJourneyBoardProps } from "./journey-board.types";

const COPIED_FOR_MS = 2000;

const emptyProgress: JourneyProgress = { name: "", results: {}, notes: {} };

const subscribeToNothing = () => () => {};

export const useJourneyBoard = ({ flow, groups, labels, siteName, heading, flowTitle }: UseJourneyBoardProps) => {
  // `false` on the server and while hydrating, then `true`: the saved progress is read only after mount, so the
  // server and the first client render agree.
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  // What the tester changed during this visit; until then, the progress saved in this browser.
  const [edited, setEdited] = useState<JourneyProgress | null>(null);
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const rows = groups.flatMap((group) => group.rows);
  const rowIds = rows.map((row) => row.id);
  const progress = edited ?? (mounted ? readProgress(flow, rowIds) : null) ?? emptyProgress;
  const counter = formatCounter(labels.counter, countResults(rowIds, progress.results));

  useEffect(() => {
    if (copyState !== "copied") {
      return;
    }

    const timeout = setTimeout(() => setCopyState("idle"), COPIED_FOR_MS);

    return () => clearTimeout(timeout);
  }, [copyState]);

  const save = (next: JourneyProgress) => {
    setEdited(next);
    writeProgress(flow, next);
  };

  const setName = (name: string) => save({ ...progress, name });

  const toggleResult = (rowId: string, result: JourneyResult) => {
    const results = { ...progress.results };

    if (results[rowId] === result) {
      delete results[rowId];
    } else {
      results[rowId] = result;
    }

    save({ ...progress, results });
  };

  const setNote = (rowId: string, note: string) => save({ ...progress, notes: { ...progress.notes, [rowId]: note } });

  const copyResults = async () => {
    const text = buildResultsSummary({
      siteName,
      heading,
      flowTitle,
      labels,
      rows,
      progress,
      date: formatLocalDate(new Date()),
    });

    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const clearResults = () => {
    if (!window.confirm(labels.clearConfirm)) {
      return;
    }

    setEdited(emptyProgress);
    setCopyState("idle");
    removeProgress(flow);
  };

  return { progress, counter, copyState, setName, toggleResult, setNote, copyResults, clearResults };
};
