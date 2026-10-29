import type { Dictionary } from "@/i18n/dictionary.types";
import type { Locale } from "@/i18n/locales";
import { type AdminAppEntryId, type AdminAppOtherMessage, adminAppOtherMessages } from "@/modules/designs/data/admin-app-ids";

import { appT } from "./app-t";

const otherMessage = (locale: Locale, message: AdminAppOtherMessage) => {
  if (typeof message === "string") {
    return appT(locale, message);
  }

  const translated = Object.fromEntries(Object.entries(message.appParams ?? {}).map(([name, key]) => [name, appT(locale, key)]));

  return appT(locale, message.key, { ...message.params, ...translated });
};

/** An entry's note: what the frame shows, then the other messages its element can show, with the app's copy (spec 072 D-02). */
export function adminAppNote(locale: Locale, text: Dictionary["adminApp"], id: AdminAppEntryId): string {
  const { note } = text.entries[id];
  const others = adminAppOtherMessages[id];

  if (!others) {
    return note;
  }

  return `${note} ${text.otherMessages}: ${others.map((message) => `“${otherMessage(locale, message)}”`).join(" · ")}`;
}
