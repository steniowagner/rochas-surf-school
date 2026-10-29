import { colors } from "@rochas-surf-school/design-tokens";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { DesignSystemSectionProps } from "./design-system-colors.types";

const groups: { title: string; tokens: (keyof typeof colors.light)[] }[] = [
  { title: "page · surface", tokens: ["page", "surface", "dim", "sand", "band", "bandLine"] },
  { title: "ink", tokens: ["ink", "ink2", "ink3"] },
  { title: "brand", tokens: ["grape", "sun", "sun2", "lagoon", "sky", "tan"] },
  { title: "line · input", tokens: ["line", "input", "inputLine"] },
  { title: "status", tokens: ["ok", "okTint", "bad", "badTint", "warn", "warnTint", "infoTint", "grapeTint", "sunTint"] },
  { title: "on color", tokens: ["onColor", "onGrapeTint", "onGrapeFill", "onGrapeTrack", "onGrapeShade", "onGrapeBad"] },
  { title: "shadow · scrim", tokens: ["shadow", "shadowSun", "shadowGrape", "scrim"] },
];

const cssVar = (token: string) => `var(--ds-${token.replace(/([a-z])([A-Z0-9])/g, "$1-$2").toLowerCase()})`;

export function DesignSystemColors({ text }: DesignSystemSectionProps) {
  const entry = text.entries["DS-01-01"];

  return (
    <DesignSection number="01" title={text.sections.color.title} description={text.sections.color.description}>
      <DesignEntry id="DS-01-01" title={entry.title} note={entry.note}>
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.title} className="flex flex-col gap-2.5">
              <p className="ds-text-section-label text-ink-2">{group.title}</p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                {group.tokens.map((token) => (
                  <div key={token} data-token={token} className="overflow-hidden rounded-card border border-line bg-surface">
                    <div data-testid={`swatch-${token}`} className="h-16 border-b border-line" style={{ background: cssVar(token) }} />
                    <div className="flex flex-col gap-0.5 p-2.5">
                      <p className="ds-text-list-title text-ink">{token}</p>
                      <p className="ds-text-list-subtitle break-all text-ink-2">{`${text.labels.light}: ${colors.light[token]}`}</p>
                      <p className="ds-text-list-subtitle break-all text-ink-2">{`${text.labels.dark}: ${colors.dark[token]}`}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DesignEntry>
    </DesignSection>
  );
}
