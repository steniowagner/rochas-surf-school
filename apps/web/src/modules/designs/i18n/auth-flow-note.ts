import type { Dictionary } from "@/i18n/dictionary.types";
import type { Locale } from "@/i18n/locales";
import { type AuthFlowEntryId, authFlowOtherMessages } from "@/modules/designs/data/auth-flow-ids";

import { appT } from "./app-t";

/** An entry's note: what the frame shows, then the other messages its element can show, with the app's copy (spec 072 D-02). */
export function authFlowNote(locale: Locale, text: Dictionary["authFlow"], id: AuthFlowEntryId): string {
  const { note } = text.entries[id];
  const others = authFlowOtherMessages[id];

  if (!others) {
    return note;
  }

  return `${note} ${text.otherMessages}: ${others.map((key) => `“${appT(locale, key)}”`).join(" · ")}`;
}
