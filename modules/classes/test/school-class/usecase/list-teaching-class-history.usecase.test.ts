import { ForbiddenError, ValidationError, ValidationException } from "@rochas-surf-school/shared";
import { CLASS_CARD_STUDENTS_LIMIT, ListTeachingClassHistory } from "../../../src";
import {
  ADMIN,
  buildClassView,
  FakeClassRosterReader,
  FakeClassViewReader,
  FakeClockProvider,
  FakeTeachingClassesReader,
  INSTRUCTOR,
  STUDENT,
} from "../../mock";

const NOW = new Date("2026-10-15T11:30:00.000Z");
const AUGUST_20 = buildClassView({
  id: "c-08-20",
  startsAt: new Date("2026-08-20T11:00:00.000Z"),
  endsAt: new Date("2026-08-20T12:00:00.000Z"),
});
const AUGUST_10 = buildClassView({
  id: "c-08-10",
  startsAt: new Date("2026-08-10T11:00:00.000Z"),
  endsAt: new Date("2026-08-10T12:00:00.000Z"),
  instructors: [
    { id: "someone-else", name: "Zeca" },
    { id: INSTRUCTOR.id, name: "Ana" },
  ],
});

function setup(history: Record<string, string[]> = { [INSTRUCTOR.id]: ["c-08-20", "c-08-10"] }) {
  const teachingClasses = new FakeTeachingClassesReader({}, [], history);
  const rosters = new FakeClassRosterReader({
    "c-08-20": { students: [], guests: [{ id: "g-1", name: "Carolina" }] },
  });
  const useCase = new ListTeachingClassHistory(
    teachingClasses,
    new FakeClassViewReader([AUGUST_20, AUGUST_10]),
    rosters,
    new FakeClockProvider(NOW),
  );

  return { useCase, teachingClasses, rosters };
}

describe("ListTeachingClassHistory", () => {
  it("answers the classes taught in the period, in the reader's order, with the guests' names", async () => {
    const { useCase, teachingClasses, rosters } = setup();

    const out = await useCase.execute({ actor: INSTRUCTOR, from: "2026-08-01", to: "2026-08-31" });

    expect(out.items.map((item) => item.id)).toEqual(["c-08-20", "c-08-10"]);
    expect(out.items.every((item) => item.myEnrolment === null)).toBe(true);
    expect(JSON.stringify(out.items[0])).toContain("Carolina");
    expect(rosters.calls[0]?.studentsLimit).toBe(CLASS_CARD_STUDENTS_LIMIT);
    expect(teachingClasses.historyCalls).toEqual([
      {
        teacherId: INSTRUCTOR.id,
        now: NOW,
        // 00:00 Fortaleza on 1 August, up to (not including) 00:00 Fortaleza on 1 September.
        from: new Date("2026-08-01T03:00:00.000Z"),
        to: new Date("2026-09-01T03:00:00.000Z"),
      },
    ]);
  });

  it("answers an admin who taught a class", async () => {
    const { useCase } = setup({ [ADMIN.id]: ["c-08-10"] });

    const out = await useCase.execute({ actor: ADMIN, from: "2026-08-10", to: "2026-08-10" });

    expect(out.items.map((item) => item.id)).toEqual(["c-08-10"]);
  });

  it("leaves out a class that is gone", async () => {
    const { useCase } = setup({ [INSTRUCTOR.id]: ["c-08-20", "gone"] });

    const out = await useCase.execute({ actor: INSTRUCTOR, from: "2026-08-01", to: "2026-08-31" });

    expect(out.items.map((item) => item.id)).toEqual(["c-08-20"]);
  });

  it("answers no items, reading no roster, when nothing was taught in the period", async () => {
    const { useCase, rosters } = setup({});

    expect(await useCase.execute({ actor: INSTRUCTOR, from: "2026-08-01", to: "2026-08-31" })).toEqual({
      items: [],
    });
    expect(rosters.calls).toEqual([]);
  });

  it("accepts a period of 42 days", async () => {
    const { useCase, teachingClasses } = setup();

    await useCase.execute({ actor: INSTRUCTOR, from: "2026-08-01", to: "2026-09-11" });

    expect(teachingClasses.historyCalls).toHaveLength(1);
  });

  it.each([
    [{}, ["class.from.invalid", "class.to.invalid"]],
    [{ to: "2026-08-31" }, ["class.from.invalid"]],
    [{ from: "2026-08-01", to: "31/08/2026" }, ["class.to.invalid"]],
    [{ from: "2026-08-02", to: "2026-08-01" }, ["class.range.invalid"]],
    [{ from: "2026-08-01", to: "2026-09-12" }, ["class.range.invalid"]],
  ])("refuses %j with %j, reading nothing", async (query, keys) => {
    const { useCase, teachingClasses } = setup();

    await expect(useCase.execute({ actor: INSTRUCTOR, ...query })).rejects.toEqual(
      new ValidationException(keys.map((key) => new ValidationError(key))),
    );
    expect(teachingClasses.historyCalls).toEqual([]);
  });

  it("refuses a student before checking the period", async () => {
    await expect(setup().useCase.execute({ actor: STUDENT, from: "x" })).rejects.toEqual(
      new ForbiddenError("user.role.notTeacher"),
    );
  });

  it("refuses an instructor who isn't approved before checking the period", async () => {
    await expect(
      setup().useCase.execute({ actor: { ...INSTRUCTOR, status: "pending" } }),
    ).rejects.toEqual(new ForbiddenError("user.status.notApproved"));
  });
});
