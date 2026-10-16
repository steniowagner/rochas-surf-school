import { enUS } from "date-fns/locale";

import {
  formatDateLine,
  schoolDayOf,
  schoolTimeOf,
} from "./week";

const LABELS = { today: "Today", tomorrow: "Tomorrow", yesterday: "Yesterday" };

describe("school time", () => {
  it("reads the day and time in America/Fortaleza", () => {
    expect(schoolDayOf("2026-10-15T02:30:00.000Z")).toBe("2026-10-14");
    expect(schoolTimeOf("2026-10-14T11:00:00.000Z")).toBe("08:00");
  });
});

describe("formatDateLine", () => {
  it("says Today, Tomorrow and Yesterday", () => {
    expect(formatDateLine("2026-10-14", "2026-10-14", enUS, LABELS)).toBe("Today · 14 Oct");
    expect(formatDateLine("2026-10-15", "2026-10-14", enUS, LABELS)).toBe("Tomorrow · 15 Oct");
    expect(formatDateLine("2026-10-13", "2026-10-14", enUS, LABELS)).toBe("Yesterday · 13 Oct");
  });

  it("uses the weekday name for other days", () => {
    expect(formatDateLine("2026-10-16", "2026-10-14", enUS, LABELS)).toBe("Friday · 16 Oct");
  });

  it("adds the year when it isn't the current one", () => {
    expect(formatDateLine("2027-01-05", "2026-12-31", enUS, LABELS)).toBe("Tuesday · 5 Jan 2027");
  });
});
