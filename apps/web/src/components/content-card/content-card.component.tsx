import type { ContentCardProps } from "./content-card.types";

export function ContentCard({ title, children }: ContentCardProps) {
  return (
    <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4 wrap-break-word">
      {title ? <h2 className="ds-text-section-label text-ink-2">{title}</h2> : null}
      <div className="ds-text-body flex flex-col gap-3 text-ink">{children}</div>
    </section>
  );
}
