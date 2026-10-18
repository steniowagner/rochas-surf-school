import { isWithoutInstructor } from "../../../src";

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
