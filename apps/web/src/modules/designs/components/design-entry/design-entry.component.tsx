import type { DesignEntryProps } from "./design-entry.types";

export function DesignEntry({ id, title, note, children }: DesignEntryProps) {
  return (
    <article id={id} data-design-id={id} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4.5">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <span className="ds-text-chip rounded-full bg-sand px-2 py-0.5 text-ink-2">{id}</span>
          <h3 className="ds-text-section-label text-ink-2">{title}</h3>
        </div>
        {note ? <p className="ds-text-list-subtitle text-ink-2">{note}</p> : null}
      </header>
      {children}
    </article>
  );
}
