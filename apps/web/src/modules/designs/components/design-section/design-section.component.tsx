import type { DesignSectionProps } from "./design-section.types";

export function DesignSection({ number, title, description, children }: DesignSectionProps) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby={`section-${number}`}>
      <div className="flex items-baseline gap-4">
        <h2 id={`section-${number}`} className="ds-text-screen-title text-ink">{`${number} — ${title}`}</h2>
        <div className="h-px flex-1 bg-line" />
      </div>
      {description ? <p className="ds-text-body max-w-160 text-ink-2">{description}</p> : null}
      {children}
    </section>
  );
}
