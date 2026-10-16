import { buildBatchRequest } from "./batch-request";

const form = {
  discipline: "skate" as const,
  level: "expert" as const,
  startDate: "2026-10-15",
  endDate: "2026-10-17",
  excludedDates: [] as string[],
  skipPast: false,
  timeRanges: [{ start: "08:00", end: "09:00" }],
  locationId: "l-1",
  instructorIds: ["t-1", "t-2"],
  capacity: 12,
  notes: "  Bring sunscreen ",
};

describe("buildBatchRequest", () => {
  it("builds the body with every weekday and the notes trimmed", () => {
    expect(buildBatchRequest(form)).toEqual({
      discipline: "skate",
      level: "expert",
      startDate: "2026-10-15",
      endDate: "2026-10-17",
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      timeRanges: [{ start: "08:00", end: "09:00" }],
      locationId: "l-1",
      instructorIds: ["t-1", "t-2"],
      capacity: 12,
      notes: "Bring sunscreen",
    });
  });

  it("sends the days taken out of the range, and leaves the key out when there are none", () => {
    expect(buildBatchRequest({ ...form, excludedDates: ["2026-10-16"] })).toMatchObject({
      excludedDates: ["2026-10-16"],
    });
    expect(buildBatchRequest(form)).not.toHaveProperty("excludedDates");
  });

  it("sends skipPast only when it is on", () => {
    expect(buildBatchRequest({ ...form, skipPast: true })).toMatchObject({ skipPast: true });
    expect(buildBatchRequest(form)).not.toHaveProperty("skipPast");
  });

  it.each(["", "   "])("leaves blank notes %j out", (notes) => {
    expect(buildBatchRequest({ ...form, notes })).not.toHaveProperty("notes");
  });
});
