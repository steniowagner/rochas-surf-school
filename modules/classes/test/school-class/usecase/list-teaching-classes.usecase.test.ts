import { ForbiddenError } from "@rochas-surf-school/shared";
import { CLASS_CARD_STUDENTS_LIMIT, ListTeachingClasses } from "../../../src";
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
const UNDER_WAY = buildClassView({
  id: "c-under-way",
  startsAt: new Date("2026-10-15T11:00:00.000Z"),
  endsAt: new Date("2026-10-15T12:00:00.000Z"),
});
const CANCELLED = buildClassView({
  id: "c-cancelled",
  startsAt: new Date("2026-10-16T11:00:00.000Z"),
  endsAt: new Date("2026-10-16T12:00:00.000Z"),
  cancelledAt: new Date("2026-10-14T09:00:00.000Z"),
});
const NEXT_WEEK = buildClassView({
  id: "c-next-week",
  startsAt: new Date("2026-10-22T11:00:00.000Z"),
  endsAt: new Date("2026-10-22T12:00:00.000Z"),
  instructors: [
    { id: "someone-else", name: "Zeca" },
    { id: INSTRUCTOR.id, name: "Ana" },
  ],
});
const SAME_START = buildClassView({
  id: "c-a-same-start",
  startsAt: CANCELLED.startsAt,
  endsAt: CANCELLED.endsAt,
});

function setup(
  current: Record<string, string[]> = { [INSTRUCTOR.id]: ["c-next-week", "c-cancelled", "c-under-way"] },
  teaching: string[] = [],
) {
  const teachingClasses = new FakeTeachingClassesReader(current, teaching);
  const rosters = new FakeClassRosterReader({
    "c-under-way": {
      students: Array.from({ length: 6 }, (_, index) => ({
        id: `s-${index}`,
        name: `Aluno ${index}`,
        photoUrl: null,
        enrolmentId: `e-s-${index}`,
      })),
      guests: [{ id: "g-1", name: "Carolina" }],
    },
  });
  const useCase = new ListTeachingClasses(
    teachingClasses,
    new FakeClassViewReader([UNDER_WAY, CANCELLED, NEXT_WEEK, SAME_START]),
    rosters,
    new FakeClockProvider(NOW),
  );

  return { useCase, teachingClasses, rosters };
}

describe("ListTeachingClasses", () => {
  it("lists the classes the instructor teaches that haven't ended, by start, cancelled ones included", async () => {
    const { useCase, teachingClasses } = setup();

    const out = await useCase.execute({ actor: INSTRUCTOR });

    expect(out.items.map((item) => item.id)).toEqual(["c-under-way", "c-cancelled", "c-next-week"]);
    expect(out.items[1]?.cancelledAt).toBe("2026-10-14T09:00:00.000Z");
    expect(out.items.every((item) => item.myEnrolment === null)).toBe(true);
    expect(out.teachesAny).toBe(true);
    expect(teachingClasses.currentCalls).toEqual([{ teacherId: INSTRUCTOR.id, now: NOW }]);
    expect(teachingClasses.teachesAnyCalls).toEqual([INSTRUCTOR.id]);
  });

  it("lists an admin's classes the same way", async () => {
    const { useCase } = setup({ [ADMIN.id]: ["c-cancelled", "c-under-way"] });

    const out = await useCase.execute({ actor: ADMIN });

    expect(out).toEqual({
      items: [expect.objectContaining({ id: "c-under-way" }), expect.objectContaining({ id: "c-cancelled" })],
      teachesAny: true,
    });
  });

  it("reads the rosters as a card shows them, with the guests' names", async () => {
    const { useCase, rosters } = setup();

    const [first] = (await useCase.execute({ actor: INSTRUCTOR })).items;

    expect(first?.students).toHaveLength(CLASS_CARD_STUDENTS_LIMIT);
    expect(first?.seatsTaken).toBe(7);
    expect(first?.guests).toEqual([{ id: "g-1", name: "Carolina" }]);
    expect(rosters.calls).toEqual([
      { classIds: ["c-under-way", "c-cancelled", "c-next-week"], studentsLimit: CLASS_CARD_STUDENTS_LIMIT },
    ]);
  });

  it("orders classes starting together by id", async () => {
    const { useCase } = setup({ [INSTRUCTOR.id]: ["c-cancelled", "c-a-same-start"] });

    const out = await useCase.execute({ actor: INSTRUCTOR });

    expect(out.items.map((item) => item.id)).toEqual(["c-a-same-start", "c-cancelled"]);
  });

  it("keeps every instructor of a class taught with someone else", async () => {
    const { useCase } = setup({ [INSTRUCTOR.id]: ["c-next-week"] });

    const [item] = (await useCase.execute({ actor: INSTRUCTOR })).items;

    expect(item?.instructors.map((instructor) => instructor.id)).toEqual([INSTRUCTOR.id, "someone-else"]);
  });

  it("answers no items and teachesAny false, reading nothing else, for someone who teaches nothing", async () => {
    const { useCase, rosters } = setup({});

    expect(await useCase.execute({ actor: ADMIN })).toEqual({ items: [], teachesAny: false });
    expect(rosters.calls).toEqual([]);
  });

  it("answers no items and teachesAny true for someone whose classes have all ended", async () => {
    const { useCase, rosters } = setup({}, [ADMIN.id]);

    expect(await useCase.execute({ actor: ADMIN })).toEqual({ items: [], teachesAny: true });
    expect(rosters.calls).toEqual([]);
  });

  it("refuses students", async () => {
    const { useCase, teachingClasses } = setup();

    await expect(useCase.execute({ actor: STUDENT })).rejects.toEqual(
      new ForbiddenError("user.role.notTeacher"),
    );
    expect(teachingClasses.currentCalls).toEqual([]);
    expect(teachingClasses.teachesAnyCalls).toEqual([]);
  });

  it("refuses an account that isn't approved first", async () => {
    const { useCase, teachingClasses } = setup();

    for (const actor of [{ ...INSTRUCTOR, status: "pending" as const }, { ...STUDENT, status: "pending" as const }]) {
      await expect(useCase.execute({ actor })).rejects.toEqual(new ForbiddenError("user.status.notApproved"));
    }
    expect(teachingClasses.currentCalls).toEqual([]);
  });
});
