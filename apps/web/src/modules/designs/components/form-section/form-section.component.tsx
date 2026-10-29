import type { FormSectionProps } from "./form-section.types";

/** A labelled block of the class form. */
export function FormSection({ label, hint, actionLabel, children }: FormSectionProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="ds-text-section-label text-ink-2">{label}</h2>
        {hint ? <p className="ds-text-list-subtitle shrink text-ink-2">{hint}</p> : null}
        {actionLabel ? (
          <span role="button" className="ds-text-chip flex min-h-11 items-center text-grape">
            {actionLabel}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
