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

/** 25 finished classes, `c-24` the newest. */
const VIEWS = Array.from({ length: 25 }, (_, index) =>
  buildClassView({
    id: `c-${String(index).padStart(2, "0")}`,
    startsAt: new Date(Date.UTC(2026, 8, 1 + index, 11)),
    endsAt: new Date(Date.UTC(2026, 8, 1 + index, 12)),
  }),
);
const NEWEST_FIRST = [...VIEWS].reverse().map((view) => view.id);

function setup(history: Record<string, string[]> = { [STUDENT.id]: NEWEST_FIRST }) {
  const myClasses = new FakeMyClassesReader({}, history);
  const rosters = new FakeClassRosterReader();
  const enrolments = new FakeViewerEnrolmentReader({
    [`${STUDENT.id}:c-24`]: { id: "e-24", status: "approved", requestedAt: new Date("2026-09-20T10:00:00.000Z") },
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
  it("answers the first page newest first, with the total", async () => {
    const { useCase, myClasses, rosters } = setup();

    const out = await useCase.execute({ actor: STUDENT, page: "1", perPage: "20" });

    expect(out.items.map((item) => item.id)).toEqual(NEWEST_FIRST.slice(0, 20));
    expect(out).toMatchObject({ total: 25, page: 1, perPage: 20 });
    expect(out.items[0]?.myEnrolment?.status).toBe("approved");
    expect(myClasses.historyCalls).toEqual([{ studentId: STUDENT.id, now: NOW, page: 1, perPage: 20 }]);
    expect(rosters.calls[0]?.studentsLimit).toBe(CLASS_CARD_STUDENTS_LIMIT);
  });

  it("answers the rest on page 2", async () => {
    const out = await setup().useCase.execute({ actor: STUDENT, page: "2", perPage: "20" });

    expect(out.items.map((item) => item.id)).toEqual(["c-04", "c-03", "c-02", "c-01", "c-00"]);
    expect(out).toMatchObject({ total: 25, page: 2, perPage: 20 });
  });

  it("pages by 20 from the first page when nothing is asked", async () => {
    const out = await setup().useCase.execute({ actor: STUDENT });

    expect(out.items).toHaveLength(20);
    expect(out).toMatchObject({ page: 1, perPage: 20 });
  });

  it("keeps the reader's order and leaves out a class that is gone", async () => {
    const { useCase } = setup({ [STUDENT.id]: ["c-03", "gone", "c-10"] });

    const out = await useCase.execute({ actor: STUDENT, perPage: "50" });

    expect(out.items.map((item) => item.id)).toEqual(["c-03", "c-10"]);
    expect(out.total).toBe(3);
  });

  it("answers an empty page, reading no class, beyond the end or without history", async () => {
    const { useCase, enrolments } = setup({});

    expect(await useCase.execute({ actor: STUDENT, page: "3" })).toEqual({
      items: [],
      total: 0,
      page: 3,
      perPage: 20,
    });
    expect(enrolments.calls).toEqual([{ viewerId: STUDENT.id, classIds: [] }]);
  });

  it.each([
    [{ page: "0" }, ["class.page.invalid"]],
    [{ page: "1.5" }, ["class.page.invalid"]],
    [{ page: "-1" }, ["class.page.invalid"]],
    [{ page: 2 }, ["class.page.invalid"]],
    [{ perPage: "0" }, ["class.perPage.invalid"]],
    [{ perPage: "51" }, ["class.perPage.invalid"]],
    [{ perPage: "ten" }, ["class.perPage.invalid"]],
    [{ page: "x", perPage: "100" }, ["class.page.invalid", "class.perPage.invalid"]],
  ])("refuses %j with 422 %j, reading nothing", async (query, keys) => {
    const { useCase, myClasses } = setup();

    await expect(useCase.execute({ actor: STUDENT, ...query })).rejects.toEqual(
      new ValidationException(keys.map((key) => new ValidationError(key))),
    );
    expect(myClasses.historyCalls).toEqual([]);
  });

  it("accepts the largest page size", async () => {
    const out = await setup().useCase.execute({ actor: STUDENT, perPage: "50" });

    expect(out.items).toHaveLength(25);
    expect(out.perPage).toBe(50);
  });

  it("refuses instructors and admins before checking the query", async () => {
    for (const actor of [INSTRUCTOR, ADMIN]) {
      await expect(setup().useCase.execute({ actor, page: "x" })).rejects.toEqual(
        new ForbiddenError("enrolment.role.notStudent"),
      );
    }
  });

  it("refuses a student who isn't approved", async () => {
    await expect(
      setup().useCase.execute({ actor: { ...STUDENT, status: "deleted" } }),
    ).rejects.toEqual(new ForbiddenError("user.status.notApproved"));
  });
});
