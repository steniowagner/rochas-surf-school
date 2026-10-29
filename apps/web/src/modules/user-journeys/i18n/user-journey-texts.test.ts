import { describe, expect, it } from "vitest";

import { flowRows, userJourneyFlowSlugs, userJourneyFlows } from "../data/user-journey-flows";
import { en } from "./en";
import type { UserJourneyTexts } from "./user-journey-texts.types";

const textsByLocale: Record<string, UserJourneyTexts> = { en };

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
