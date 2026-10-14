import { buildBatchRequest } from "./batch-request";

const form = {
  discipline: "skate" as const,
  level: "expert" as const,
  startDate: "2026-10-15",
  endDate: "2026-10-17",
  weekdays: [4, 5],
  timeRanges: [{ start: "08:00", end: "09:00" }],
  locationId: "l-1",
  instructorIds: ["t-1", "t-2"],
  capacity: 12,
  notes: "  Bring sunscreen ",
};

describe("buildBatchRequest", () => {
  it("builds the D-06 body with the notes trimmed", () => {
    expect(buildBatchRequest(form)).toEqual({
      discipline: "skate",
      level: "expert",
      startDate: "2026-10-15",
      endDate: "2026-10-17",
      weekdays: [4, 5],
      timeRanges: [{ start: "08:00", end: "09:00" }],
      locationId: "l-1",
      instructorIds: ["t-1", "t-2"],
      capacity: 12,
      notes: "Bring sunscreen",
    });
  });

  it.each(["", "   "])("leaves blank notes %j out", (notes) => {
    expect(buildBatchRequest({ ...form, notes })).not.toHaveProperty("notes");
  });
});
