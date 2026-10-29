import type { Dictionary } from "@/i18n/dictionary.types";
import type { Locale } from "@/i18n/locales";
import { type InstructorAppEntryId, type InstructorAppOtherMessage, instructorAppOtherMessages } from "@/modules/designs/data/instructor-app-ids";

import { appT } from "./app-t";

const otherMessage = (locale: Locale, message: InstructorAppOtherMessage) => {
  if (typeof message === "string") {
    return appT(locale, message);
  }

  const translated = Object.fromEntries(Object.entries(message.appParams ?? {}).map(([name, key]) => [name, appT(locale, key)]));

  return appT(locale, message.key, { ...message.params, ...translated });
};

/** An entry's note: what the frame shows, then the other messages its element can show, with the app's copy (spec 072 D-02). */
export function instructorAppNote(locale: Locale, text: Dictionary["instructorApp"], id: InstructorAppEntryId): string {
  const { note } = text.entries[id];
  const others = instructorAppOtherMessages[id];

  if (!others) {
    return note;
  }

  return `${note} ${text.otherMessages}: ${others.map((message) => `“${otherMessage(locale, message)}”`).join(" · ")}`;
}
