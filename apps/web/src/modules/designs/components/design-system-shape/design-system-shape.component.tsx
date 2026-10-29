import { elevation, iconSizes, radii, spacing, touchTarget } from "@rochas-surf-school/design-tokens";

import { AppIcon } from "../app-icon";
import type { AppIconName } from "../app-icon";
import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { DesignSystemSectionProps } from "./design-system-shape.types";

const kebab = (key: string) => key.replace(/([A-Z])/g, "-$1").toLowerCase();

const iconSets: { set: string; glyphs: AppIconName[] }[] = [
  { set: "Ionicons", glyphs: ["Ionicons:calendar-outline", "Ionicons:ticket-outline", "Ionicons:time-outline", "Ionicons:location-outline", "Ionicons:notifications-outline"] },
  { set: "Feather", glyphs: ["Feather:users", "Feather:map-pin", "Feather:chevron-right", "Feather:trash-2", "Feather:mail"] },
  { set: "FontAwesome", glyphs: ["FontAwesome:whatsapp"] },
  { set: "FontAwesome6", glyphs: ["FontAwesome6:circle-user"] },
  { set: "MaterialCommunityIcons", glyphs: ["MaterialCommunityIcons:surfing", "MaterialCommunityIcons:account-minus", "MaterialCommunityIcons:send-outline"] },
  { set: "SimpleLineIcons", glyphs: ["SimpleLineIcons:graph"] },
];

export function DesignSystemShape({ text }: DesignSystemSectionProps) {
  const e = text.entries;

  return (
    <DesignSection number="03" title={text.sections.shape.title} description={text.sections.shape.description}>
      <DesignEntry id="DS-03-01" title={e["DS-03-01"].title} note={e["DS-03-01"].note}>
        <div className="flex flex-wrap gap-4">
          {(Object.keys(radii) as (keyof typeof radii)[]).map((key) => (
            <div key={key} className="flex flex-col items-center gap-1.5">
              <div className="size-14 bg-sand" style={{ borderRadius: `var(--ds-radius-${kebab(key)})` }} />
              <span className="ds-text-list-subtitle text-ink-2">{`${key} · ${radii[key]}`}</span>
            </div>
          ))}
        </div>
      </DesignEntry>
      <DesignEntry id="DS-03-02" title={e["DS-03-02"].title} note={e["DS-03-02"].note}>
        <div className="flex flex-col gap-3">
          {(Object.keys(spacing) as (keyof typeof spacing)[]).map((key) => (
            <div key={key} className="flex items-center gap-3">
              <div className="h-3 rounded-full bg-lagoon" style={{ width: spacing[key] * 4 }} />
              <span className="ds-text-list-subtitle text-ink-2">{`${key} · ${spacing[key]}`}</span>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <div className="rounded-control border border-line bg-sand" style={{ width: touchTarget, height: touchTarget }} />
            <span className="ds-text-list-subtitle text-ink-2">{`${text.labels.touchTarget} · ${touchTarget}`}</span>
          </div>
        </div>
      </DesignEntry>
      <DesignEntry id="DS-03-03" title={e["DS-03-03"].title} note={e["DS-03-03"].note}>
        <div className="flex flex-wrap gap-5">
          {(Object.keys(elevation) as (keyof typeof elevation)[]).map((key) => (
            <div key={key} className="flex flex-col items-center gap-2">
              <div className="h-12 w-20 rounded-icon-button bg-surface" style={{ boxShadow: `var(--ds-elevation-${kebab(key)})` }} />
              <span className="ds-text-list-subtitle text-ink-2">{key}</span>
            </div>
          ))}
        </div>
      </DesignEntry>
      <DesignEntry id="DS-03-04" title={e["DS-03-04"].title} note={e["DS-03-04"].note}>
        <div className="flex flex-col gap-3">
          {iconSets.map((entry) => (
            <div key={entry.set} className="flex flex-wrap items-center gap-4">
              <span className="ds-text-section-label w-52 text-ink-2">{entry.set}</span>
              <div className="flex gap-3.5 text-ink">
                {entry.glyphs.map((glyph) => (
                  <AppIcon key={glyph} name={glyph} size={iconSizes.bar} />
                ))}
              </div>
            </div>
          ))}
          <p className="ds-text-list-subtitle text-ink-2">{`${text.labels.iconSizes}: ${Object.entries(iconSizes).map(([key, size]) => `${key} ${size}`).join(" · ")}`}</p>
        </div>
      </DesignEntry>
    </DesignSection>
  );
}
