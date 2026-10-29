import { describe, expect, it } from "vitest";

import { instructorAppOtherMessages } from "../data/instructor-app-ids";

import { dictionaries } from "./test-dictionaries";
import { instructorAppNote } from "./instructor-app-note";

describe("instructorAppNote", () => {
  it("is the note alone when the entry has no other messages", async () => {
    const { instructorApp } = await dictionaries["pt-br"]();

    expect(instructorAppNote("pt-br", instructorApp, "IN-01-01")).toBe(instructorApp.entries["IN-01-01"].note);
  });

  it("lists the other messages in the page language, with their values filled", async () => {
    const { instructorApp } = await dictionaries.en();

    expect(instructorAppNote("en", instructorApp, "IN-03-10")).toBe(`${instructorApp.entries["IN-03-10"].note} Other messages: “Number not shared.”`);
    expect(instructorAppNote("en", instructorApp, "IN-05-03")).toContain("“In 2 weeks”");
    expect(instructorAppNote("pt-br", (await dictionaries["pt-br"]()).instructorApp, "IN-04-10")).toContain("“Você não deu nenhuma aula de Surf neste período.”");
  });

  it("resolves every other message key in every language", async () => {
    for (const locale of ["pt-br", "es", "en"] as const) {
      const { instructorApp } = await dictionaries[locale]();
      for (const id of Object.keys(instructorAppOtherMessages) as (keyof typeof instructorAppOtherMessages)[]) {
        expect(instructorAppNote(locale, instructorApp, id), `${locale} ${id}`).not.toMatch(/\{\{|  /);
      }
    }
  });
});
