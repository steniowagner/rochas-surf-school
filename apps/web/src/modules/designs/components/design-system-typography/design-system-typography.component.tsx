import { fontFamilies, fontWeights, typography } from "@rochas-surf-school/design-tokens";

import { appT } from "@/modules/designs/i18n/app-t";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { DesignSystemSectionProps } from "./design-system-typography.types";

const sampleKeys: Partial<Record<keyof typeof typography, string>> = {
  screenTitle: "classesWeek.newClass",
  screenTitleWithBack: "classesWeek.newClass",
  sheetTitle: "language.title",
  body: "language.description",
  listTitle: "classesWeek.students.none",
  listSubtitle: "classesWeek.occupancy",
  sectionLabel: "classesWeek.hasClasses",
  button: "classesWeek.create",
  cardMeta: "classesWeek.loading",
  occupancy: "classesWeek.occupancy",
  chip: "classesWeek.full",
  pill: "classesWeek.state.started",
  greeting: "userHeader.greeting.morning",
  greetingName: "classesWeek.newClass",
  sheetDescription: "language.description",
  previewTitle: "classesWeek.emptyDay.title",
  previewBody: "language.description",
  tabBarLabel: "tabs.agenda",
};

const fixedSamples: Partial<Record<keyof typeof typography, string>> = {
  wordmark: "ROCHA'S",
  kpi: "86%",
  dayNumber: "26",
  lessonTime: "09:00 – 10:30",
  occupancyCell: "75%",
  calendarDay: "12",
  calendarMonthDay: "12",
  badge: "3",
};

const kebab = (key: string) => key.replace(/([A-Z])/g, "-$1").toLowerCase();

export function DesignSystemTypography({ locale, text }: DesignSystemSectionProps) {
  const families = text.entries["DS-02-01"];
  const styles = text.entries["DS-02-02"];

  const sample = (key: keyof typeof typography) => {
    const copyKey = sampleKeys[key];
    return copyKey ? appT(locale, copyKey, { taken: 4, capacity: 8, count: 4, date: "12/09" }) : (fixedSamples[key] ?? key);
  };

  return (
    <DesignSection number="02" title={text.sections.typography.title} description={text.sections.typography.description}>
      <DesignEntry id="DS-02-01" title={families.title} note={families.note}>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(fontFamilies) as (keyof typeof fontFamilies)[]).map((role) => (
            <div key={role} className="rounded-card border border-line p-4">
              <p className="ds-text-section-label text-ink-2">{`${role} · ${fontFamilies[role]} · ${fontWeights[role].join(", ")}`}</p>
              <p className={role === "display" ? "ds-text-screen-title mt-2 text-ink" : "ds-text-body mt-2 text-ink"}>{fontFamilies[role]}</p>
            </div>
          ))}
        </div>
      </DesignEntry>
      <DesignEntry id="DS-02-02" title={styles.title} note={styles.note}>
        <div className="flex flex-col divide-y divide-line overflow-hidden rounded-card border border-line">
          {(Object.keys(typography) as (keyof typeof typography)[]).map((key) => {
            const style = typography[key];

            return (
              <div key={key} data-type-style={key} className="grid items-center gap-4 p-4 sm:grid-cols-[minmax(160px,260px)_1fr]">
                <p className="ds-text-list-subtitle text-ink-2">
                  {`${key} · ${style.font} ${style.weight} · ${style.size}/${style.lineHeight} · ${style.letterSpacing}em · ${style.uppercase ? text.labels.caseUpper : text.labels.caseNormal}`}
                </p>
                <p className={`ds-text-${kebab(key)} truncate text-ink`}>{sample(key)}</p>
              </div>
            );
          })}
        </div>
      </DesignEntry>
    </DesignSection>
  );
}
