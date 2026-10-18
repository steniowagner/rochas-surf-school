import { ForbiddenError, ValidationException } from "@rochas-surf-school/shared";
import { ListWeekClasses } from "../../../src";
import {
  ADMIN,
  buildClassView,
  FakeClassViewReader,
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

function useCase(views = ALL) {
  return new ListWeekClasses(new FakeClassViewReader(views));
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
      location: { id: expect.any(String), name: "Praia do Futuro", address: "Av. Zezé Diogo, 1000" },
      instructors: [
        { id: "i-3", name: "Álvaro" },
        { id: "i-1", name: "ana" },
        { id: "i-2", name: "Bruno" },
      ],
    });
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
});
