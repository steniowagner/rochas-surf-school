import { CancellationDeadlineDescription, computeCancellationDeadline } from "../../../src";

const STARTS_AT = new Date("2026-10-20T11:00:00.000Z"); // Tuesday 08:00 in Fortaleza

function iso(description: CancellationDeadlineDescription): string | null {
  return computeCancellationDeadline(description, STARTS_AT)?.toISOString() ?? null;
}

describe("computeCancellationDeadline", () => {
  it("subtracts the minutes", () => {
    expect(iso({ kind: "minutesBefore", minutes: 720 })).toBe("2026-10-19T23:00:00.000Z");
    expect(iso({ kind: "minutesBefore", minutes: 0 })).toBe("2026-10-20T11:00:00.000Z");
    expect(iso({ kind: "minutesBefore", minutes: 43200 })).toBe("2026-09-20T11:00:00.000Z");
  });

  it("takes days before the Fortaleza day at the given time", () => {
    expect(iso({ kind: "daysBeforeAt", days: 1, time: "18:00" })).toBe("2026-10-19T21:00:00.000Z");
    expect(iso({ kind: "daysBeforeAt", days: 2, time: "00:00" })).toBe("2026-10-18T03:00:00.000Z");
  });

  it("uses the Fortaleza calendar day even when the UTC day differs", () => {
    const lateNight = new Date("2026-10-21T02:00:00.000Z"); // Tuesday 23:00 in Fortaleza

    expect(
      computeCancellationDeadline({ kind: "daysBeforeAt", days: 1, time: "12:00" }, lateNight)!.toISOString(),
    ).toBe("2026-10-19T15:00:00.000Z");
  });

  it("gives the start for classStart", () => {
    expect(iso({ kind: "classStart" })).toBe("2026-10-20T11:00:00.000Z");
  });

  it("caps a deadline after the start at the start", () => {
    expect(iso({ kind: "daysBeforeAt", days: 0, time: "09:00" })).toBe("2026-10-20T11:00:00.000Z");
  });

  it("is null for unclear and for unusable values", () => {
    expect(iso({ kind: "unclear" })).toBeNull();
    expect(iso({ kind: "minutesBefore", minutes: -1 })).toBeNull();
    expect(iso({ kind: "minutesBefore", minutes: 43201 })).toBeNull();
    expect(iso({ kind: "minutesBefore", minutes: 1.5 })).toBeNull();
    expect(iso({ kind: "minutesBefore" } as never)).toBeNull();
    expect(iso({ kind: "daysBeforeAt", days: 31, time: "10:00" })).toBeNull();
    expect(iso({ kind: "daysBeforeAt", days: -1, time: "10:00" })).toBeNull();
    expect(iso({ kind: "daysBeforeAt", days: 1, time: "24:00" })).toBeNull();
    expect(iso({ kind: "daysBeforeAt", days: 1, time: "8:00" })).toBeNull();
    expect(iso({ kind: "daysBeforeAt", days: 1 } as never)).toBeNull();
    expect(iso({ kind: "other" } as never)).toBeNull();
  });
});
