import { classCards } from "@/modules/designs/data/fortaleza";

import { ClassCard } from "../class-card";
import { ClassCardSkeleton } from "../class-card-skeleton";
import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { DesignSystemSectionProps } from "./design-system-class-cards.types";

const cards = [
  ["DS-06-01", "notStarted"],
  ["DS-06-02", "full"],
  ["DS-06-03", "next"],
  ["DS-06-04", "started"],
  ["DS-06-05", "finished"],
  ["DS-06-06", "cancelled"],
  ["DS-06-07", "flags"],
  ["DS-06-08", "enrolment"],
  ["DS-06-09", "erased"],
] as const;

export function DesignSystemClassCards({ locale, text }: DesignSystemSectionProps) {
  return (
    <DesignSection number="06" title={text.sections.classCard.title} description={text.sections.classCard.description}>
      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([id, card]) => (
          <DesignEntry key={id} id={id} title={text.entries[id].title} note={text.entries[id].note}>
            <ClassCard locale={locale} {...classCards[card]} />
          </DesignEntry>
        ))}
        <DesignEntry id="DS-06-10" title={text.entries["DS-06-10"].title} note={text.entries["DS-06-10"].note}>
          <ClassCardSkeleton />
        </DesignEntry>
      </div>
    </DesignSection>
  );
}
