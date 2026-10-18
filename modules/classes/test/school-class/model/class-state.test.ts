import { getClassState } from "../../../src";

const STARTS_AT = new Date("2026-10-14T11:00:00.000Z"); // 08:00 in Fortaleza
const ENDS_AT = new Date("2026-10-14T12:30:00.000Z"); // 09:30 in Fortaleza

function at(date: Date, offsetMs = 0) {
  return new Date(date.getTime() + offsetMs);
}

describe("getClassState", () => {
  it("is not started 1 ms before the start", () => {
    expect(getClassState(STARTS_AT, ENDS_AT, at(STARTS_AT, -1))).toBe("not-started");
  });

  it("is started at the start", () => {
    expect(getClassState(STARTS_AT, ENDS_AT, STARTS_AT)).toBe("started");
  });

  it("is started 1 ms before the end", () => {
    expect(getClassState(STARTS_AT, ENDS_AT, at(ENDS_AT, -1))).toBe("started");
  });

  it("is finished at the end", () => {
    expect(getClassState(STARTS_AT, ENDS_AT, ENDS_AT)).toBe("finished");
  });

  it("is cancelled whenever it has a cancellation, before, during and after its time", () => {
    const cancelledAt = new Date("2026-10-13T10:00:00.000Z");

    expect(getClassState(STARTS_AT, ENDS_AT, at(STARTS_AT, -1), cancelledAt)).toBe("cancelled");
    expect(getClassState(STARTS_AT, ENDS_AT, STARTS_AT, cancelledAt)).toBe("cancelled");
    expect(getClassState(STARTS_AT, ENDS_AT, ENDS_AT, cancelledAt)).toBe("cancelled");
  });

  it("follows the clock with a null or absent cancellation", () => {
    expect(getClassState(STARTS_AT, ENDS_AT, STARTS_AT, null)).toBe("started");
    expect(getClassState(STARTS_AT, ENDS_AT, ENDS_AT, undefined)).toBe("finished");
  });

  it("is not started days before and finished days after", () => {
    const day = 24 * 60 * 60 * 1000;

    expect(getClassState(STARTS_AT, ENDS_AT, at(STARTS_AT, -3 * day))).toBe("not-started");
    expect(getClassState(STARTS_AT, ENDS_AT, at(ENDS_AT, 3 * day))).toBe("finished");
  });
});
