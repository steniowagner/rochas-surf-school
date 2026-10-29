import { adminAppNote } from "@/modules/designs/i18n/admin-app-note";
import { HomeScreen } from "@/modules/designs/screens/admin/home-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { AdminAppHomeProps } from "./admin-app-home.types";

export function AdminAppHome({ locale, text }: AdminAppHomeProps) {
  const frames = [
    { id: "AD-01-01", screen: <HomeScreen locale={locale} state="home" /> },
    { id: "AD-01-02", screen: <HomeScreen locale={locale} state="notTeaching" /> },
    { id: "AD-01-03", screen: <HomeScreen locale={locale} state="loading" /> },
  ] as const;

  return (
    <DesignSection number="01" title={text.sections.home.title} description={text.sections.home.description}>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {frames.map(({ id, screen }) => (
          <DesignEntry key={id} id={id} title={text.entries[id].title} note={adminAppNote(locale, text, id)}>
            {screen}
          </DesignEntry>
        ))}
      </div>
    </DesignSection>
  );
}
