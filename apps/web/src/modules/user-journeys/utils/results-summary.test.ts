import { describe, expect, it } from "vitest";

import { en as dictionary } from "@/i18n/dictionaries/en";

import { flowRows } from "../data/user-journey-flows";
import { en } from "../i18n/en";
import { buildResultsSummary, countResults, formatCounter, formatLocalDate } from "./results-summary";

const rows = flowRows("student").map((row) => ({ id: row.id, title: en.rows[row.id].title }));
const base = {
  siteName: dictionary.site.name,
  heading: dictionary.userJourneys.title,
  flowTitle: en.flows.student.title,
  labels: dictionary.userJourneys.labels,
  rows,
  date: "2026-10-29",
};

describe("buildResultsSummary", () => {
  it("writes the D-15 text for ER-07's example", () => {
    const text = buildResultsSummary({
      ...base,
      progress: {
        name: "Ana",
        results: { "ST-01": "approved", "ST-02": "denied" },
        notes: { "ST-01": "Slow to load", "ST-02": "Arrows skip a week" },
      },
    });
    const lines = text.split("\n");

    expect(lines.slice(0, 7)).toEqual([
      "Rocha's Surf School — User journeys: Student app",
      "Tester: Ana",
      "Date: 2026-10-29",
      "1 approved · 1 denied · 26 not tested",
      "",
      "ST-01 — The schedule opens on this week: Approved — Slow to load",
      "ST-02 — Switch between week and month: Denied — Arrows skip a week",
    ]);
    expect(lines).toHaveLength(5 + 28);
    expect(lines.slice(7)).toEqual(rows.slice(2).map((row) => `${row.id} — ${row.title}: Not tested`));
  });

  it("writes — for an empty name and leaves out blank notes", () => {
    const lines = buildResultsSummary({
      ...base,
      progress: { name: "  ", results: { "ST-03": "approved" }, notes: { "ST-03": "   " } },
    }).split("\n");

    expect(lines[1]).toBe("Tester: —");
    expect(lines[7]).toBe("ST-03 — Filter the classes by sport: Approved");
  });

  it("keeps the note of an untested row, trimmed", () => {
    const lines = buildResultsSummary({
      ...base,
      progress: { name: " Ana ", results: {}, notes: { "ST-28": "  The bell has no number  " } },
    }).split("\n");

    expect(lines[1]).toBe("Tester: Ana");
    expect(lines[3]).toBe("0 approved · 0 denied · 28 not tested");
    expect(lines.at(-1)).toBe("ST-28 — Read your notifications: Not tested — The bell has no number");
  });
});

describe("countResults", () => {
  it("counts only the given rows", () => {
    expect(countResults(["A", "B", "C"], { A: "approved", B: "denied", Z: "approved" })).toEqual({
      approved: 1,
      denied: 1,
      notTested: 1,
    });
  });
});

describe("formatCounter", () => {
  it("fills the three counts", () => {
    expect(formatCounter("{approved} / {denied} / {notTested}", { approved: 3, denied: 2, notTested: 1 })).toBe(
      "3 / 2 / 1",
    );
  });
});

describe("formatLocalDate", () => {
  it("writes the local date as YYYY-MM-DD", () => {
    expect(formatLocalDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(formatLocalDate(new Date(2026, 10, 30, 0, 1))).toBe("2026-11-30");
  });
});
