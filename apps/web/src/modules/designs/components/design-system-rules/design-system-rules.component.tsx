import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { DesignSystemSectionProps } from "./design-system-rules.types";

export function DesignSystemRules({ text }: DesignSystemSectionProps) {
  const entry = text.entries["DS-08-01"];

  return (
    <DesignSection number="08" title={text.sections.rules.title} description={text.sections.rules.description}>
      <DesignEntry id="DS-08-01" title={entry.title} note={entry.note}>
        <ol className="flex list-decimal flex-col gap-2 pl-5">
          {text.rules.map((rule) => (
            <li key={rule} className="ds-text-body text-ink">{rule}</li>
          ))}
        </ol>
      </DesignEntry>
    </DesignSection>
  );
}
