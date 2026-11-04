import { describe, expect, it } from "vitest";

import type { Locale } from "@/i18n/locales";
import { appT } from "@/modules/designs/i18n/app-t";

import { flowRows, userJourneyFlowSlugs, userJourneyFlows } from "../data/user-journey-flows";
import { en } from "./en";
import { es } from "./es";
import { ptBr } from "./pt-br";
import type { UserJourneyTexts } from "./user-journey-texts.types";

const textsByLocale: Record<string, UserJourneyTexts> = { en, "pt-br": ptBr, es };
const translations: Record<string, UserJourneyTexts> = { "pt-br": ptBr, es };

describe.each(Object.entries(textsByLocale))("user journey texts (%s)", (_locale, texts) => {
  it("gives every flow a title, a description, an account and a title per group", () => {
    for (const flow of userJourneyFlowSlugs) {
      const flowTexts = texts.flows[flow];
      expect(flowTexts.title.trim(), flow).not.toBe("");
      expect(flowTexts.description.trim(), flow).not.toBe("");
      expect(flowTexts.account.trim(), flow).not.toBe("");
      for (const group of userJourneyFlows[flow].groups) {
        expect((flowTexts.groups as Record<string, string>)[group.key]?.trim(), `${flow}.${group.key}`).toBeTruthy();
      }
    }
  });

  it("gives every row non-empty texts, and no row beyond the flows'", () => {
    const ids = userJourneyFlowSlugs.flatMap((flow) => flowRows(flow).map((row) => row.id));

    expect(Object.keys(texts.rows).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      for (const field of ["title", "beforeYouStart", "steps", "expected"] as const) {
        expect(texts.rows[id][field].trim(), `${id}.${field}`).not.toBe("");
      }
    }
  });
});

describe("user journey texts (en)", () => {
  it("names the flows as D-20 does", () => {
    expect(userJourneyFlowSlugs.map((flow) => en.flows[flow].title)).toEqual([
      "Auth",
      "Student app",
      "Instructor app",
      "Admin app",
    ]);
  });

  it("says in each role flow that a missing push alone isn't a failure (D-18)", () => {
    for (const flow of ["student", "instructor", "admin"] as const) {
      expect(en.flows[flow].description).toContain("isn't a failure");
    }
  });
});

describe.each(Object.entries(translations))("user journey texts (%s)", (_locale, texts) => {
  it("translates every row title and flow title (none repeats the English one)", () => {
    for (const flow of userJourneyFlowSlugs) {
      expect(texts.flows[flow].title, flow).not.toBe(en.flows[flow].title);
      for (const row of flowRows(flow)) {
        expect(texts.rows[row.id].title, row.id).not.toBe(en.rows[row.id].title);
      }
    }
  });
});

// Each accept decision is confirmed in a sheet first (spec 085): the row quotes the app's button and sheet title.
const acceptRows = [
  { id: "AD-02", button: "registrations.approve", sheet: "registrations.approveSheet" },
  { id: "AD-04", button: "reactivations.approve", sheet: "reactivations.approveSheet" },
  { id: "AD-05", button: "people.removed.restore", sheet: "removedAccounts.restoreSheet" },
  { id: "AD-17", button: "classRequests.approve", sheet: "classRequests.approveSheet" },
] as const;

const leavesAfterConfirming: Record<Locale, RegExp> = {
  en: /once you confirm/i,
  "pt-br": /depois de confirmar/i,
  es: /después de confirmar/i,
};

describe.each(Object.entries(textsByLocale) as [Locale, UserJourneyTexts][])("accept confirmation rows (%s)", (locale, texts) => {
  it.each(acceptRows)("$id tells the tester to confirm in the sheet, which names the person", ({ id, button, sheet }) => {
    const row = texts.rows[id];

    expect(row.steps).toContain(`"${appT(locale, button)}"`);
    expect(row.steps).toContain(`"${appT(locale, `${sheet}.title`)}"`);
    expect(row.expected).toContain(`"${appT(locale, button)}"`);
    expect(row.expected).toMatch(/sheet/);
    expect(row.expected).toMatch(leavesAfterConfirming[locale]);
  });
});
