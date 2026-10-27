import { ForbiddenError, ValidationException } from "@rochas-surf-school/shared";
import { ListWeekClasses } from "../../../src";
import {
  ADMIN,
  buildClassView,
  FakeClassRosterReader,
  FakeClassViewReader,
  FakeViewerEnrolmentReader,
  INSTRUCTOR,
  STUDENT,
} from "../../mock";

// Fortaleza is UTC-3 all year.
function view(id: string, start: string, end = start, overrides = {}) {
  return buildClassView({
    id,
    startsAt: new Date(start),
    endsAt: new Date(end),
    ...overrides,
  });
}

const SUNDAY_BEFORE = view("sun-before", "2026-10-12T02:59:00.000Z"); // Sun 11th 23:59
const MONDAY = view("monday", "2026-10-12T03:00:00.000Z"); // Mon 12th 00:00
const WEDNESDAY_LATE = view("wed-late", "2026-10-14T19:00:00.000Z");
const WEDNESDAY_EARLY = view("wed-early", "2026-10-14T11:00:00.000Z", "2026-10-14T12:00:00.000Z", {
  instructors: [
    { id: "i-2", name: "Bruno" },
    { id: "i-1", name: "ana" },
    { id: "i-3", name: "Álvaro" },
  ],
});
const SUNDAY_LAST = view("sun-last", "2026-10-19T02:00:00.000Z"); // Sun 18th 23:00
const MONDAY_NEXT = view("mon-next", "2026-10-19T03:00:00.000Z"); // Mon 19th 00:00

const ALL = [
  MONDAY_NEXT,
  WEDNESDAY_LATE,
  SUNDAY_BEFORE,
  SUNDAY_LAST,
  WEDNESDAY_EARLY,
  MONDAY,
];

function useCase(
  views = ALL,
  rosters = new FakeClassRosterReader(),
  viewerEnrolments = new FakeViewerEnrolmentReader(),
) {
  return new ListWeekClasses(new FakeClassViewReader(views), rosters, viewerEnrolments);
}

describe("ListWeekClasses", () => {
  it("lists the classes of the week that holds the date, in Fortaleza time and start order", async () => {
    const out = await useCase().execute({ actor: STUDENT, date: "2026-10-15" });

    expect(out.weekStart).toBe("2026-10-12");
    expect(out.items.map((item) => item.id)).toEqual([
      "monday",
      "wed-early",
      "wed-late",
      "sun-last",
    ]);
  });

  it("answers the same week for Monday and Sunday", async () => {
    const monday = await useCase().execute({ actor: ADMIN, date: "2026-10-12" });
    const sunday = await useCase().execute({ actor: INSTRUCTOR, date: "2026-10-18" });

    expect(monday).toEqual(sunday);
    expect(monday.weekStart).toBe("2026-10-12");
  });

  it("shapes each item with ISO dates, the location and the instructors sorted ignoring case and accents", async () => {
    const out = await useCase().execute({ actor: STUDENT, date: "2026-10-14" });
    const item = out.items.find((entry) => entry.id === "wed-early")!;

    expect(item).toEqual({
      id: "wed-early",
      discipline: "surf",
      level: "beginner",
      startsAt: "2026-10-14T11:00:00.000Z",
      endsAt: "2026-10-14T12:00:00.000Z",
      capacity: 8,
      notes: null,
      cancelledAt: null,
      cancellationMessage: null,
      cancellationDeadline: null,
      location: { id: expect.any(String), name: "Praia do Futuro", address: "Av. Zezé Diogo, 1000", latitude: -3.7442, longitude: -38.4617 },
      instructors: [
        { id: "i-3", name: "Álvaro" },
        { id: "i-1", name: "ana" },
        { id: "i-2", name: "Bruno" },
      ],
      seatsTaken: 0,
      students: [],
      guests: [],
      myEnrolment: null,
    });
  });

  it("carries the seats taken and the first 4 students of each class, in the order given", async () => {
    const seven = Array.from({ length: 7 }, (_, index) => ({
      id: `s-${index}`,
      name: `Aluno ${index}`,
      photoUrl: null,
      enrolmentId: `e-${index}`,
    }));
    const rosters = new FakeClassRosterReader({
      monday: { students: seven },
      "wed-late": { students: seven.slice(0, 2) },
    });

    const out = await useCase(ALL, rosters).execute({ actor: STUDENT, date: "2026-10-15" });
    const byId = Object.fromEntries(out.items.map((item) => [item.id, item]));

    expect(byId["monday"]).toMatchObject({ seatsTaken: 7, students: seven.slice(0, 4) });
    expect(byId["wed-late"]).toMatchObject({ seatsTaken: 2, students: seven.slice(0, 2) });
    expect(byId["wed-early"]).toMatchObject({ seatsTaken: 0, students: [] });
    expect(rosters.calls).toHaveLength(1);
    expect(rosters.calls[0]!.studentsLimit).toBe(4);
  });

  it("carries the caller's latest enrolment on each class that has one and null on the rest", async () => {
    const requestedAt = new Date("2026-10-14T10:00:00.000Z");
    const viewerEnrolments = new FakeViewerEnrolmentReader({
      [`${STUDENT.id}:monday`]: { id: "e-1", status: "pending", requestedAt },
    });

    const out = await useCase(ALL, new FakeClassRosterReader(), viewerEnrolments).execute({
      actor: STUDENT,
      date: "2026-10-15",
    });
    const byId = Object.fromEntries(out.items.map((item) => [item.id, item]));

    expect(byId["monday"]!.myEnrolment).toEqual({
      id: "e-1",
      status: "pending",
      requestedAt: "2026-10-14T10:00:00.000Z",
      reason: null,
    });
    expect(byId["wed-early"]!.myEnrolment).toBeNull();
    expect(viewerEnrolments.calls).toHaveLength(1);
    expect(viewerEnrolments.calls[0]!.viewerId).toBe(STUDENT.id);
    expect(new Set(viewerEnrolments.calls[0]!.classIds)).toEqual(new Set(out.items.map((item) => item.id)));

    const admin = await useCase(ALL, new FakeClassRosterReader(), viewerEnrolments).execute({
      actor: ADMIN,
      date: "2026-10-15",
    });
    expect(admin.items.every((item) => item.myEnrolment === null)).toBe(true);
  });

  it("shapes a cancelled class with its ISO cancellation and message", async () => {
    const out = await useCase([
      view("x", "2026-10-14T11:00:00.000Z", "2026-10-14T12:00:00.000Z", {
        cancelledAt: new Date("2026-10-13T15:30:00.000Z"),
        cancellationMessage: "Mar muito grande.",
      }),
    ]).execute({ actor: STUDENT, date: "2026-10-14" });

    expect(out.items[0]).toMatchObject({
      cancelledAt: "2026-10-13T15:30:00.000Z",
      cancellationMessage: "Mar muito grande.",
    });
  });

  it("shapes the cancellation deadline as an ISO date", async () => {
    const out = await useCase([
      view("x", "2026-10-14T11:00:00.000Z", "2026-10-14T12:00:00.000Z", {
        cancellationDeadline: new Date("2026-10-13T23:00:00.000Z"),
      }),
    ]).execute({ actor: STUDENT, date: "2026-10-14" });

    expect(out.items[0].cancellationDeadline).toBe("2026-10-13T23:00:00.000Z");
  });

  it("orders the same start by end and then id, and the same name by id", async () => {
    const out = await useCase([
      view("b", "2026-10-14T11:00:00.000Z", "2026-10-14T12:00:00.000Z"),
      view("c", "2026-10-14T11:00:00.000Z", "2026-10-14T11:30:00.000Z", {
        instructors: [
          { id: "z", name: "Ana" },
          { id: "y", name: "ana" },
        ],
      }),
      view("a", "2026-10-14T11:00:00.000Z", "2026-10-14T12:00:00.000Z"),
    ]).execute({ actor: ADMIN, date: "2026-10-14" });

    expect(out.items.map((item) => item.id)).toEqual(["c", "a", "b"]);
    expect(out.items[0]!.instructors.map((i) => i.id)).toEqual(["y", "z"]);
  });

  it("passes erased instructors and students through with a null name, the erased instructors last by id", async () => {
    const students = [
      { id: "s-erased", name: null, photoUrl: null, enrolmentId: "e-erased" },
      { id: "s-1", name: "Aluno 1", photoUrl: null, enrolmentId: "e-1" },
    ];
    const out = await useCase(
      [
        view("c", "2026-10-14T11:00:00.000Z", "2026-10-14T12:00:00.000Z", {
          instructors: [
            { id: "x", name: null },
            { id: "z", name: "Zeca" },
            { id: "w", name: null },
            { id: "y", name: "ana" },
          ],
        }),
        view("d", "2026-10-15T11:00:00.000Z", "2026-10-15T12:00:00.000Z", {
          instructors: [{ id: "only", name: null }],
        }),
      ],
      new FakeClassRosterReader({ c: { students } }),
    ).execute({ actor: STUDENT, date: "2026-10-14" });

    expect(out.items[0]!.instructors).toEqual([
      { id: "y", name: "ana" },
      { id: "z", name: "Zeca" },
      { id: "w", name: null },
      { id: "x", name: null },
    ]);
    expect(out.items[0]).toMatchObject({ seatsTaken: 2, students });
    expect(out.items[1]!.instructors).toEqual([{ id: "only", name: null }]);
  });

  it("answers an empty week", async () => {
    const out = await useCase().execute({ actor: ADMIN, date: "2026-11-02" });

    expect(out).toEqual({ weekStart: "2026-11-02", items: [] });
  });

  it.each([undefined, null, 20261015, "15/10/2026", "2026-02-30"])(
    "refuses the date %p",
    async (date) => {
      await expect(useCase().execute({ actor: ADMIN, date })).rejects.toMatchObject({
        constructor: ValidationException,
        errors: [expect.objectContaining({ message: "class.date.invalid" })],
      });
    },
  );

  it("refuses a pending account before looking at the date", async () => {
    const pending = { ...STUDENT, status: "pending" as const };

    await expect(useCase().execute({ actor: pending, date: "nope" })).rejects.toThrow(
      ForbiddenError,
    );
  });

  describe("guests", () => {
    const GUESTS = [
      { id: "g-1", name: "Carolina Reis" },
      { id: "g-2", name: null },
    ];
    const rosters = () =>
      new FakeClassRosterReader({ wed: { students: [], guests: GUESTS } });
    const wed = () =>
      view("wed", "2026-10-14T11:00:00.000Z", "2026-10-14T12:00:00.000Z", {
        instructors: [{ id: INSTRUCTOR.id, name: "Ana" }],
      });

    it("shows the names to an admin and to the class's instructor, uncapped, counting the seats", async () => {
      for (const actor of [ADMIN, INSTRUCTOR]) {
        const out = await useCase([wed(), MONDAY], rosters()).execute({ actor, date: "2026-10-15" });

        expect(out.items.find((item) => item.id === "wed")).toMatchObject({ guests: GUESTS, seatsTaken: 2 });
        expect(out.items.find((item) => item.id === "monday")?.guests).toEqual([]);
      }
    });

    it("hides the names from students and from the instructors of other classes", async () => {
      const other = { ...INSTRUCTOR, id: "0f1e2d3c-4b5a-4968-8776-5a4b3c2d1e0f" };

      for (const actor of [STUDENT, other]) {
        const out = await useCase([wed()], rosters()).execute({ actor, date: "2026-10-15" });

        expect(out.items[0].guests).toEqual([
          { id: "g-1", name: null },
          { id: "g-2", name: null },
        ]);
        expect(out.items[0].seatsTaken).toBe(2);
      }
    });
  });
});
