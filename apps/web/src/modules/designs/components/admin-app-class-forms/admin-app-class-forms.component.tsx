import { adminAppNote } from "@/modules/designs/i18n/admin-app-note";
import { EditClassScreen } from "@/modules/designs/screens/admin/edit-class-screen";
import { HomeScreen } from "@/modules/designs/screens/admin/home-screen";
import { LocationFormScreen } from "@/modules/designs/screens/admin/location-form-screen";
import { NewClassScreen } from "@/modules/designs/screens/admin/new-class-screen";

import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { AdminAppClassFormsProps } from "./admin-app-class-forms.types";

// AD-04-06: the batch of AD-04-02 created; the form went back to the home that opened it.
const CLASSES_CREATED = { key: "newClass.created", params: { count: 8 } };

export function AdminAppClassForms({ locale, text }: AdminAppClassFormsProps) {
  const frames = [
    { id: "AD-04-01", screen: <NewClassScreen locale={locale} state="empty" notes={text.classNotes} /> },
    { id: "AD-04-02", screen: <NewClassScreen locale={locale} state="filled" notes={text.classNotes} /> },
    { id: "AD-04-03", screen: <NewClassScreen locale={locale} state="timeSheet" notes={text.classNotes} /> },
    { id: "AD-04-04", screen: <EditClassScreen locale={locale} state="managingLocations" notes={text.classNotes} /> },
    { id: "AD-04-05", screen: <LocationFormScreen locale={locale} state="archive" /> },
    { id: "AD-04-06", screen: <HomeScreen locale={locale} state="home" toast={CLASSES_CREATED} /> },
    { id: "AD-04-07", screen: <LocationFormScreen locale={locale} state="new" /> },
    { id: "AD-04-08", screen: <LocationFormScreen locale={locale} state="pointPicked" /> },
    { id: "AD-04-09", screen: <LocationFormScreen locale={locale} state="edit" /> },
    { id: "AD-04-10", screen: <LocationFormScreen locale={locale} state="duplicate" /> },
    { id: "AD-04-11", screen: <EditClassScreen locale={locale} state="edit" notes={text.classNotes} /> },
    { id: "AD-04-12", screen: <EditClassScreen locale={locale} state="started" notes={text.classNotes} /> },
    { id: "AD-04-13", screen: <EditClassScreen locale={locale} state="loading" notes={text.classNotes} /> },
  ] as const;

  return (
    <DesignSection number="04" title={text.sections.classForms.title} description={text.sections.classForms.description}>
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
