import { instructorAppNote } from "@/modules/designs/i18n/instructor-app-note";
import { WeeklyOccupancyScreen } from "@/modules/designs/screens/instructor/weekly-occupancy-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { InstructorAppOccupancyProps } from "./instructor-app-occupancy.types";

export function InstructorAppOccupancy({ locale, text }: InstructorAppOccupancyProps) {
  const frames = [
    { id: "IN-05-01", screen: <WeeklyOccupancyScreen locale={locale} state="week" /> },
    { id: "IN-05-02", screen: <WeeklyOccupancyScreen locale={locale} state="otherSelected" /> },
    { id: "IN-05-03", screen: <WeeklyOccupancyScreen locale={locale} state="nextWeek" /> },
    { id: "IN-05-04", screen: <WeeklyOccupancyScreen locale={locale} state="picker" /> },
    { id: "IN-05-05", screen: <WeeklyOccupancyScreen locale={locale} state="loading" /> },
    { id: "IN-05-06", screen: <WeeklyOccupancyScreen locale={locale} state="empty" /> },
    { id: "IN-05-07", screen: <WeeklyOccupancyScreen locale={locale} state="error" /> },
  ] as const;

  return (
    <DesignSection number="05" title={text.sections.occupancy.title} description={text.sections.occupancy.description}>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {frames.map(({ id, screen }) => (
          <DesignEntry key={id} id={id} title={text.entries[id].title} note={instructorAppNote(locale, text, id)}>
            {screen}
          </DesignEntry>
        ))}
      </div>
    </DesignSection>
  );
}
