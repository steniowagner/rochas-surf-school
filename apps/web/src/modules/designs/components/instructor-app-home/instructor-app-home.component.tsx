import { instructorAppNote } from "@/modules/designs/i18n/instructor-app-note";
import { HomeScreen } from "@/modules/designs/screens/instructor/home-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { InstructorAppHomeProps } from "./instructor-app-home.types";

export function InstructorAppHome({ locale, text }: InstructorAppHomeProps) {
  const frames = [
    { id: "IN-01-01", screen: <HomeScreen locale={locale} state="home" /> },
    { id: "IN-01-02", screen: <HomeScreen locale={locale} state="noneAssigned" /> },
    { id: "IN-01-03", screen: <HomeScreen locale={locale} state="loading" /> },
  ] as const;

  return (
    <DesignSection number="01" title={text.sections.home.title} description={text.sections.home.description}>
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
