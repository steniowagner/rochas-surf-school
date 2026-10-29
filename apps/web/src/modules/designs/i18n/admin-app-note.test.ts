import { describe, expect, it } from "vitest";

import { adminAppOtherMessages } from "../data/admin-app-ids";

import { adminAppNote } from "./admin-app-note";
import { dictionaries } from "./test-dictionaries";

describe("adminAppNote", () => {
  it("is the note alone when the entry has no other messages", async () => {
    const { adminApp } = await dictionaries["pt-br"]();

    expect(adminAppNote("pt-br", adminApp, "AD-01-01")).toBe(adminApp.entries["AD-01-01"].note);
  });

  it("lists the other messages in the page language, with their values filled", async () => {
    const { adminApp } = await dictionaries.en();

    expect(adminAppNote("en", adminApp, "AD-03-04")).toBe(`${adminApp.entries["AD-03-04"].note} Other messages: “The waiting list is off — nobody can ask.”`);
    expect(adminAppNote("pt-br", (await dictionaries["pt-br"]()).adminApp, "AD-10-05")).toContain("“Regra de surf salva”");
    expect(adminAppNote("pt-br", (await dictionaries["pt-br"]()).adminApp, "AD-04-06")).toContain("“Máximo de 200 aulas por vez.”");
  });

  it("resolves every other message key in every language", async () => {
    for (const locale of ["pt-br", "es", "en"] as const) {
      const { adminApp } = await dictionaries[locale]();
      for (const id of Object.keys(adminAppOtherMessages) as (keyof typeof adminAppOtherMessages)[]) {
        expect(adminAppNote(locale, adminApp, id), `${locale} ${id}`).not.toMatch(/\{\{|  /);
      }
    }
  });
});
