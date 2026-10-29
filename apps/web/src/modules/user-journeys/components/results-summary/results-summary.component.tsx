import { Button } from "@/components/ui/button";

import type { ResultsSummaryProps } from "./results-summary.types";

export function ResultsSummary({ labels, name, counter, copyState, onNameChange, onCopy, onClear }: ResultsSummaryProps) {
  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <label className="flex flex-col gap-1">
        <span className="ds-text-section-label text-ink-2">{labels.yourName}</span>
        <input
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          autoComplete="name"
          className="ds-text-body min-h-11 w-full rounded-control border border-input-line bg-input px-3 text-ink"
        />
      </label>
      <p className="ds-text-list-title text-ink" data-testid="journey-counter">
        {counter}
      </p>
      <p className="ds-text-list-subtitle text-ink-2">{labels.savedProgress}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={onCopy} className="sm:w-auto">
          {copyState === "copied" ? labels.copied : labels.copyResults}
        </Button>
        <Button type="button" variant="outline" onClick={onClear} className="sm:w-auto">
          {labels.clearResults}
        </Button>
      </div>
      {copyState === "failed" ? (
        <p role="alert" className="ds-text-list-subtitle text-bad">
          {labels.copyFailed}
        </p>
      ) : null}
    </section>
  );
}
