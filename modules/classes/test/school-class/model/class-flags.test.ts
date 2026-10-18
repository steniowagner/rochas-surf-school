import { isWithoutDeadline, isWithoutInstructor } from "../../../src";

describe("isWithoutInstructor", () => {
  it("is true for a class that hasn't started and has no instructor", () => {
    expect(isWithoutInstructor(0, "not-started")).toBe(true);
  });

  it("is false for a class that hasn't started and has an instructor", () => {
    expect(isWithoutInstructor(1, "not-started")).toBe(false);
  });

  it("is false for a started, finished or cancelled class with no instructor", () => {
    expect(isWithoutInstructor(0, "started")).toBe(false);
    expect(isWithoutInstructor(0, "finished")).toBe(false);
    expect(isWithoutInstructor(0, "cancelled")).toBe(false);
  });
});

describe("isWithoutDeadline", () => {
  it("is true for a class that hasn't started and has no deadline", () => {
    expect(isWithoutDeadline(null, "not-started")).toBe(true);
  });

  it("is false once the class has a deadline", () => {
    expect(isWithoutDeadline(new Date("2026-10-14T10:00:00.000Z"), "not-started")).toBe(false);
    expect(isWithoutDeadline("2026-10-14T10:00:00.000Z", "not-started")).toBe(false);
  });

  it("is false for a started, finished or cancelled class with no deadline", () => {
    expect(isWithoutDeadline(null, "started")).toBe(false);
    expect(isWithoutDeadline(null, "finished")).toBe(false);
    expect(isWithoutDeadline(null, "cancelled")).toBe(false);
  });
});
