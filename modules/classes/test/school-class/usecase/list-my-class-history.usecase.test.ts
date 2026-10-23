import { ForbiddenError, ValidationError, ValidationException } from "@rochas-surf-school/shared";
import { CLASS_CARD_STUDENTS_LIMIT, ListMyClassHistory } from "../../../src";
import {
  ADMIN,
  buildClassView,
  FakeClassRosterReader,
  FakeClassViewReader,
  FakeClockProvider,
  FakeMyClassesReader,
  FakeViewerEnrolmentReader,
  INSTRUCTOR,
  STUDENT,
} from "../../mock";

const NOW = new Date("2026-10-15T11:30:00.000Z");

/** 25 finished classes in August 2026, `c-24` the newest. */
const VIEWS = Array.from({ length: 25 }, (_, index) =>
  buildClassView({
    id: `c-${String(index).padStart(2, "0")}`,
    startsAt: new Date(Date.UTC(2026, 7, 1 + index, 11)),
    endsAt: new Date(Date.UTC(2026, 7, 1 + index, 12)),
  }),
);
const NEWEST_FIRST = [...VIEWS].reverse().map((view) => view.id);

function setup(history: Record<string, string[]> = { [STUDENT.id]: NEWEST_FIRST }) {
  const myClasses = new FakeMyClassesReader({}, history);
  const rosters = new FakeClassRosterReader();
  const enrolments = new FakeViewerEnrolmentReader({
    [`${STUDENT.id}:c-24`]: { id: "e-24", status: "approved", requestedAt: new Date("2026-08-20T10:00:00.000Z") },
  });
  const useCase = new ListMyClassHistory(
    myClasses,
    new FakeClassViewReader(VIEWS),
    rosters,
    enrolments,
    new FakeClockProvider(NOW),
  );

  return { useCase, myClasses, rosters, enrolments };
}

describe("ListMyClassHistory", () => {
  it("answers every class of the period, in the reader's order, unpaged", async () => {
    const { useCase, myClasses, rosters } = setup();

    const out = await useCase.execute({ actor: STUDENT, from: "2026-08-01", to: "2026-08-31" });

    expect(out).toEqual({ items: expect.any(Array) });
    expect(out.items.map((item) => item.id)).toEqual(NEWEST_FIRST);
    expect(out.items[0]?.myEnrolment?.status).toBe("approved");
    expect(rosters.calls[0]?.studentsLimit).toBe(CLASS_CARD_STUDENTS_LIMIT);
    expect(myClasses.historyCalls).toEqual([
      {
        studentId: STUDENT.id,
        now: NOW,
        // 00:00 Fortaleza on 1 August, up to (not including) 00:00 Fortaleza on 1 September.
        from: new Date("2026-08-01T03:00:00.000Z"),
        to: new Date("2026-09-01T03:00:00.000Z"),
      },
    ]);
  });

  it("asks for a single day when from equals to", async () => {
    const { useCase, myClasses } = setup();

    await useCase.execute({ actor: STUDENT, from: "2026-12-31", to: "2026-12-31" });

    expect(myClasses.historyCalls[0]).toMatchObject({
      from: new Date("2026-12-31T03:00:00.000Z"),
      to: new Date("2027-01-01T03:00:00.000Z"),
    });
  });

  it("keeps the reader's order and leaves out a class that is gone", async () => {
    const { useCase } = setup({ [STUDENT.id]: ["c-03", "gone", "c-10"] });

    const out = await useCase.execute({ actor: STUDENT, from: "2026-08-01", to: "2026-08-31" });

    expect(out.items.map((item) => item.id)).toEqual(["c-03", "c-10"]);
  });

  it("answers no items, reading no class, when nothing was taken in the period", async () => {
    const { useCase, enrolments } = setup({});

    expect(await useCase.execute({ actor: STUDENT, from: "2026-08-01", to: "2026-08-31" })).toEqual({
      items: [],
    });
    expect(enrolments.calls).toEqual([{ viewerId: STUDENT.id, classIds: [] }]);
  });

  it("accepts a period of 42 days", async () => {
    const { useCase, myClasses } = setup();

    await useCase.execute({ actor: STUDENT, from: "2026-08-01", to: "2026-09-11" });

    expect(myClasses.historyCalls).toHaveLength(1);
  });

  it.each([
    [{}, ["class.from.invalid", "class.to.invalid"]],
    [{ page: "1", perPage: "20" }, ["class.from.invalid", "class.to.invalid"]],
    [{ to: "2026-08-31" }, ["class.from.invalid"]],
    [{ from: "2026-08-01" }, ["class.to.invalid"]],
    [{ from: "2026-02-30", to: "2026-03-01" }, ["class.from.invalid"]],
    [{ from: "2026-08-01", to: "31/08/2026" }, ["class.to.invalid"]],
    [{ from: 20260801, to: "2026-08-31" }, ["class.from.invalid"]],
    [{ from: "x", to: "y" }, ["class.from.invalid", "class.to.invalid"]],
    [{ from: "2026-08-02", to: "2026-08-01" }, ["class.range.invalid"]],
    [{ from: "2026-08-01", to: "2026-09-12" }, ["class.range.invalid"]],
  ])("refuses %j with 422 %j, reading nothing", async (query, keys) => {
    const { useCase, myClasses } = setup();

    await expect(useCase.execute({ actor: STUDENT, ...query })).rejects.toEqual(
      new ValidationException(keys.map((key) => new ValidationError(key))),
    );
    expect(myClasses.historyCalls).toEqual([]);
  });

  it("refuses instructors and admins before checking the period", async () => {
    for (const actor of [INSTRUCTOR, ADMIN]) {
      await expect(setup().useCase.execute({ actor, from: "x" })).rejects.toEqual(
        new ForbiddenError("enrolment.role.notStudent"),
      );
    }
  });

  it("refuses a student who isn't approved before checking the period", async () => {
    await expect(
      setup().useCase.execute({ actor: { ...STUDENT, status: "deleted" } }),
    ).rejects.toEqual(new ForbiddenError("user.status.notApproved"));
  });
});
