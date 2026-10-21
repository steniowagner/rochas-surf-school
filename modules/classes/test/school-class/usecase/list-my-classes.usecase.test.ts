import { ForbiddenError } from "@rochas-surf-school/shared";
import { CLASS_CARD_STUDENTS_LIMIT, ListMyClasses } from "../../../src";
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
const UNDER_WAY = buildClassView({
  id: "c-under-way",
  startsAt: new Date("2026-10-15T11:00:00.000Z"),
  endsAt: new Date("2026-10-15T12:00:00.000Z"),
});
const PENDING = buildClassView({
  id: "c-pending",
  startsAt: new Date("2026-10-16T11:00:00.000Z"),
  endsAt: new Date("2026-10-16T12:00:00.000Z"),
});
const WITHDRAWN = buildClassView({
  id: "c-withdrawn",
  startsAt: new Date("2026-10-17T11:00:00.000Z"),
  endsAt: new Date("2026-10-17T12:00:00.000Z"),
});
const SAME_START = buildClassView({
  id: "c-a-same-start",
  startsAt: PENDING.startsAt,
  endsAt: PENDING.endsAt,
});

const ENROLMENTS = {
  [`${STUDENT.id}:c-under-way`]: { id: "e-1", status: "approved", requestedAt: new Date("2026-10-10T10:00:00.000Z") },
  [`${STUDENT.id}:c-pending`]: { id: "e-2", status: "pending", requestedAt: new Date("2026-10-11T10:00:00.000Z") },
  [`${STUDENT.id}:c-withdrawn`]: { id: "e-3", status: "withdrawn", requestedAt: new Date("2026-10-12T10:00:00.000Z") },
};

function setup(current: Record<string, string[]> = { [STUDENT.id]: ["c-withdrawn", "c-pending", "c-under-way"] }) {
  const myClasses = new FakeMyClassesReader(current);
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
  const enrolments = new FakeViewerEnrolmentReader(ENROLMENTS);
  const useCase = new ListMyClasses(
    myClasses,
    new FakeClassViewReader([UNDER_WAY, PENDING, WITHDRAWN, SAME_START]),
    rosters,
    enrolments,
    new FakeClockProvider(NOW),
  );

  return { useCase, myClasses, rosters, enrolments };
}

describe("ListMyClasses", () => {
  it("lists the student's current classes by start, each with their latest enrolment", async () => {
    const { useCase, myClasses } = setup();

    const out = await useCase.execute({ actor: STUDENT });

    expect(out.items.map((item) => [item.id, item.myEnrolment?.status])).toEqual([
      ["c-under-way", "approved"],
      ["c-pending", "pending"],
      ["c-withdrawn", "withdrawn"],
    ]);
    expect(out.items[1]?.myEnrolment).toEqual({
      id: "e-2",
      status: "pending",
      requestedAt: "2026-10-11T10:00:00.000Z",
      reason: null,
    });
    expect(myClasses.currentCalls).toEqual([{ studentId: STUDENT.id, now: NOW }]);
  });

  it("reads the rosters as a card shows them, hiding the guests' names from the student", async () => {
    const { useCase, rosters, enrolments } = setup();

    const [first] = (await useCase.execute({ actor: STUDENT })).items;

    expect(first?.students).toHaveLength(CLASS_CARD_STUDENTS_LIMIT);
    expect(first?.seatsTaken).toBe(7);
    expect(first?.guests).toEqual([{ id: "g-1", name: null }]);
    expect(rosters.calls).toEqual([
      { classIds: ["c-under-way", "c-pending", "c-withdrawn"], studentsLimit: CLASS_CARD_STUDENTS_LIMIT },
    ]);
    expect(enrolments.calls).toEqual([
      { viewerId: STUDENT.id, classIds: ["c-under-way", "c-pending", "c-withdrawn"] },
    ]);
  });

  it("orders classes starting together by id", async () => {
    const { useCase } = setup({ [STUDENT.id]: ["c-pending", "c-a-same-start"] });

    const out = await useCase.execute({ actor: STUDENT });

    expect(out.items.map((item) => item.id)).toEqual(["c-a-same-start", "c-pending"]);
    expect(out.items[0]?.myEnrolment).toBeNull();
  });

  it("answers no items, reading nothing else, for a student without enrolments", async () => {
    const { useCase, rosters, enrolments } = setup({});

    expect(await useCase.execute({ actor: STUDENT })).toEqual({ items: [] });
    expect(rosters.calls).toEqual([]);
    expect(enrolments.calls).toEqual([]);
  });

  it("refuses instructors and admins", async () => {
    for (const actor of [INSTRUCTOR, ADMIN]) {
      const { useCase, myClasses } = setup();

      await expect(useCase.execute({ actor })).rejects.toEqual(
        new ForbiddenError("enrolment.role.notStudent"),
      );
      expect(myClasses.currentCalls).toEqual([]);
    }
  });

  it("refuses a student who isn't approved first", async () => {
    const { useCase } = setup();

    await expect(useCase.execute({ actor: { ...STUDENT, status: "pending" } })).rejects.toEqual(
      new ForbiddenError("user.status.notApproved"),
    );
  });
});
