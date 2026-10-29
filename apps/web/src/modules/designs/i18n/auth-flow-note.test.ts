import { describe, expect, it } from "vitest";

import { authFlowIds, authFlowOtherMessages } from "@/modules/designs/data/auth-flow-ids";
import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { authFlowNote } from "./auth-flow-note";

describe("authFlowNote", () => {
  it("returns the note as it is when the entry has no other messages", async () => {
    const { authFlow } = await dictionaries.en();

    expect(authFlowNote("en", authFlow, "AF-01-01")).toBe(authFlow.entries["AF-01-01"].note);
  });

  it("lists the other messages with the app's copy in the page language", async () => {
    const { authFlow } = await dictionaries["pt-br"]();
    const note = authFlowNote("pt-br", authFlow, "AF-02-12");

    expect(note.startsWith(authFlow.entries["AF-02-12"].note)).toBe(true);
    expect(note).toContain("Outras mensagens: “");
    expect(note).toContain(" · ");
    expect(note).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });

  it.each(["pt-br", "es", "en"] as const)("resolves every other message of every entry in %s", async (locale) => {
    const { authFlow } = await dictionaries[locale]();

    for (const id of authFlowIds) {
      const count = authFlowOtherMessages[id]?.length ?? 0;
      const added = authFlowNote(locale, authFlow, id).slice(authFlow.entries[id].note.length);
      expect(added.split("“").length - 1, id).toBe(count);
    }
  });
});
