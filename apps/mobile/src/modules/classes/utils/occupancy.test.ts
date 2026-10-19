import {
  getFreeSeats,
  getHiddenSeats,
  getOccupancyPercent,
  getOccupancyTone,
  getStudentsLabel,
  isClassFull,
} from "./occupancy";

describe("getOccupancyPercent", () => {
  it.each([
    [0, 8, 0],
    [3, 8, 38],
    [7, 8, 88],
    [8, 8, 100],
    [9, 8, 100],
  ])("rounds %i of %i seats to %i%%", (taken, capacity, percent) => {
    expect(getOccupancyPercent(taken, capacity)).toBe(percent);
  });

  it("is 0 for a class without capacity", () => {
    expect(getOccupancyPercent(0, 0)).toBe(0);
  });
});

describe("isClassFull", () => {
  it("is full at and above the capacity only", () => {
    expect(isClassFull(7, 8)).toBe(false);
    expect(isClassFull(8, 8)).toBe(true);
    expect(isClassFull(9, 8)).toBe(true);
  });
});

describe("getOccupancyTone", () => {
  it("is bad when full", () => {
    expect(getOccupancyTone(8, 8, "surf")).toBe("bad");
  });

  it("is sun above 80%, but not at exactly 80%", () => {
    expect(getOccupancyTone(9, 10, "surf")).toBe("sun");
    expect(getOccupancyTone(8, 10, "surf")).toBe("lagoon");
  });

  it("follows the discipline otherwise", () => {
    expect(getOccupancyTone(0, 8, "surf")).toBe("lagoon");
    expect(getOccupancyTone(0, 8, "skate")).toBe("tan");
  });
});

describe("getFreeSeats", () => {
  it("never goes below zero", () => {
    expect(getFreeSeats(3, 8)).toBe(5);
    expect(getFreeSeats(9, 8)).toBe(0);
  });
});

describe("getHiddenSeats", () => {
  it("counts the seats no avatar shows", () => {
    expect(getHiddenSeats(7, 4)).toBe(3);
    expect(getHiddenSeats(2, 4)).toBe(0);
  });
});

describe("getStudentsLabel", () => {
  it("reads none for no seat", () => {
    expect(getStudentsLabel(0, false)).toEqual({ key: "none", count: 0 });
    expect(getStudentsLabel(0, true)).toEqual({ key: "none", count: 0 });
  });

  it("reads confirmed before the end", () => {
    expect(getStudentsLabel(3, false)).toEqual({ key: "confirmed", count: 3 });
  });

  it("reads present after the end", () => {
    expect(getStudentsLabel(3, true)).toEqual({ key: "present", count: 3 });
  });
});
