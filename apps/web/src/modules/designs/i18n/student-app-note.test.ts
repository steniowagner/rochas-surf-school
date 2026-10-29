import { describe, expect, it } from "vitest";

import { studentAppOtherMessages } from "../data/student-app-ids";

import { dictionaries } from "./test-dictionaries";
import { studentAppNote } from "./student-app-note";

describe("studentAppNote", () => {
  it("is the note alone when the entry has no other messages", async () => {
    const { studentApp } = await dictionaries["pt-br"]();

    expect(studentAppNote("pt-br", studentApp, "ST-01-01")).toBe(studentApp.entries["ST-01-01"].note);
  });

  it("lists the other messages in the page language", async () => {
    const { studentApp } = await dictionaries.en();

    const note = studentAppNote("en", studentApp, "ST-02-18");

    expect(note).toBe(`${studentApp.entries["ST-02-18"].note} Other messages: “No reason given.”`);
  });

  it("resolves every other message key in every language", async () => {
    for (const locale of ["pt-br", "es", "en"] as const) {
      const { studentApp } = await dictionaries[locale]();
      for (const id of Object.keys(studentAppOtherMessages) as (keyof typeof studentAppOtherMessages)[]) {
        expect(studentAppNote(locale, studentApp, id), `${locale} ${id}`).not.toMatch(/\{\{/);
      }
    }
  });
});
