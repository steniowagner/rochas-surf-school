import { ValidationException } from "@rochas-surf-school/shared";
import { SchoolClass } from "../../../src";
import { buildClass, INSTRUCTOR_ID } from "../../mock";

function errorsOf(action: () => void): string[] {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationException);
    return (error as ValidationException).errors.map((item) => item.message);
  }
  throw new Error("expected a ValidationException");
}

describe("SchoolClass", () => {
  it("holds a valid class", () => {
    const item = buildClass({ notes: "Bring sunscreen" });

    expect(() => item.validate()).not.toThrow();
    expect(item.discipline).toBe("surf");
    expect(item.level).toBe("beginner");
    expect(item.startsAt.toISOString()).toBe("2026-10-15T11:00:00.000Z");
    expect(item.endsAt.toISOString()).toBe("2026-10-15T12:00:00.000Z");
    expect(item.instructorIds).toEqual([INSTRUCTOR_ID]);
    expect(item.capacity).toBe(8);
    expect(item.notes).toBe("Bring sunscreen");
  });

  it("has no notes by default", () => {
    expect(buildClass().notes).toBeNull();
    expect(buildClass({ notes: null }).notes).toBeNull();
  });

  it("does not share its dates or instructors with the caller", () => {
    const item = buildClass();

    item.startsAt.setFullYear(1999);
    item.instructorIds.push("x");

    expect(item.startsAt.getFullYear()).toBe(2026);
    expect(item.instructorIds).toHaveLength(1);
  });

  it.each([
    [{ discipline: "tennis" }, ["class.discipline.in"]],
    [{ level: "pro" }, ["class.level.in"]],
    [{ capacity: 0 }, ["class.capacity.range.value"]],
    [{ capacity: 21 }, ["class.capacity.range.value"]],
    [{ capacity: 2.5 }, ["class.capacity.integer"]],
    [{ notes: "n".repeat(301) }, ["class.notes.max.length"]],
    [{ instructorIds: [] }, ["class.instructors.required"]],
    [{ instructorIds: ["not-a-uuid"] }, ["class.instructors.uuid"]],
    [{ locationId: "not-a-uuid" }, ["class.location.uuid"]],
    [{ createdBy: "not-a-uuid" }, ["class.createdBy.uuid"]],
    [
      { endsAt: new Date("2026-10-15T11:00:00.000Z") },
      ["class.endsAt.after.start"],
    ],
    [
      { endsAt: new Date("2026-10-15T10:00:00.000Z") },
      ["class.endsAt.after.start"],
    ],
  ])("refuses %j", (overrides, keys) => {
    const item = buildClass(overrides as never);

    expect(errorsOf(() => item.validate())).toEqual(keys);
  });

  it("clones with changes", () => {
    const item = buildClass();
    const copy: SchoolClass = item.clone({ capacity: 10 });

    expect(copy.capacity).toBe(10);
    expect(copy.id).toBe(item.id);
  });
});
