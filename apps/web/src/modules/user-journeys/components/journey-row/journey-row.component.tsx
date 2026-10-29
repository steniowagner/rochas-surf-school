import { designHref } from "../../utils/design-href";
import type { JourneyRowProps } from "./journey-row.types";

const cellClassName = "flex flex-col gap-1 lg:table-cell lg:border-t lg:border-line lg:p-3 lg:align-top";
const cellLabelClassName = "ds-text-section-label text-ink-2 lg:hidden";
const checkboxLabelClassName =
  "inline-flex min-h-11 min-w-11 cursor-pointer items-center gap-2 rounded-control border border-line px-3 ds-text-list-subtitle text-ink";

export function JourneyRow({ locale, row, result, note, labels, onToggleResult, onNoteChange }: JourneyRowProps) {
  return (
    <tr
      data-row-id={row.id}
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 wrap-break-word lg:table-row lg:rounded-none lg:border-0 lg:p-0"
    >
      <th scope="row" className="ds-text-list-title text-left text-ink lg:border-t lg:border-line lg:p-3 lg:align-top">
        {row.id}
      </th>
      <td className="ds-text-list-title text-ink lg:border-t lg:border-line lg:p-3 lg:align-top">{row.title}</td>
      <td className={cellClassName}>
        <span className={cellLabelClassName}>{labels.beforeYouStart}</span>
        <span className="ds-text-body text-ink">{row.beforeYouStart}</span>
      </td>
      <td className={cellClassName}>
        <span className={cellLabelClassName}>{labels.steps}</span>
        <span className="ds-text-body text-ink">{row.steps}</span>
      </td>
      <td className={cellClassName}>
        <span className={cellLabelClassName}>{labels.expectedBehavior}</span>
        <span className="ds-text-body text-ink">{row.expected}</span>
      </td>
      <td className={cellClassName}>
        <span className={cellLabelClassName}>{labels.design}</span>
        {row.designIds.length > 0 ? (
          <span className="flex flex-wrap gap-x-3 gap-y-1 lg:flex-col">
            {row.designIds.map((designId) => (
              <a
                key={designId}
                href={designHref(locale, designId)}
                target="_blank"
                rel="noopener"
                className="ds-text-list-subtitle inline-flex min-h-11 items-center text-grape underline lg:min-h-0"
              >
                {designId}
              </a>
            ))}
          </span>
        ) : (
          <span className="ds-text-body text-ink-2">—</span>
        )}
      </td>
      <td className={cellClassName}>
        <span className={cellLabelClassName}>{labels.result}</span>
        <span className="flex flex-wrap gap-2 lg:flex-col">
          <label className={checkboxLabelClassName}>
            <input
              type="checkbox"
              aria-label={`${labels.approved} — ${row.id}`}
              checked={result === "approved"}
              onChange={() => onToggleResult(row.id, "approved")}
              className="h-5 w-5 cursor-pointer accent-ok"
            />
            {labels.approved}
          </label>
          <label className={checkboxLabelClassName}>
            <input
              type="checkbox"
              aria-label={`${labels.denied} — ${row.id}`}
              checked={result === "denied"}
              onChange={() => onToggleResult(row.id, "denied")}
              className="h-5 w-5 cursor-pointer accent-bad"
            />
            {labels.denied}
          </label>
        </span>
      </td>
      <td className={cellClassName}>
        <span className={cellLabelClassName}>{labels.notes}</span>
        <textarea
          aria-label={`${labels.notes} — ${row.id}`}
          value={note}
          onChange={(event) => onNoteChange(row.id, event.target.value)}
          rows={3}
          className="ds-text-body min-h-11 w-full rounded-control border border-input-line bg-input p-3 text-ink"
        />
      </td>
    </tr>
  );
}
