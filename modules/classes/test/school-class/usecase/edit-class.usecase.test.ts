import { DomainError, ForbiddenError, NotFoundError, ValidationException } from "@rochas-surf-school/shared";
import { EditClass, EditClassIn } from "../../../src";
import {
  ADMIN,
  buildClass,
  buildLocation,
  FakeClassAssignmentNotifier,
  FakeClassAudienceReader,
  FakeClassChangeNotifier,
  FakeClockProvider,
  FakeLocationRepository,
  FakeSchoolClassRepository,
  FakeSeatCounter,
  FakeTeacherLookup,
  INSTRUCTOR,
  STUDENT,
} from "../../mock";

const NOW = new Date("2026-10-14T13:00:00.000Z"); // 10:00 in Fortaleza
const A = INSTRUCTOR.id;
const B = "9b8c7d6e-5f4a-4321-8abc-0d1e2f3a4b5c";
const C = "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f";
const PENDING = "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b";
const MISSING = "11111111-1111-4111-8111-111111111111";

interface Options {
  now?: Date;
  stored?: Parameters<typeof buildClass>[0];
  seatsTaken?: number;
  failNotifiers?: boolean;
  storedAtArchived?: boolean;
  audience?: string[];
  failAudience?: boolean;
}

function setup(options: Options = {}) {
  const location = buildLocation("Praia do Futuro");
  const other = buildLocation("Cumbuco");
  const archived = buildLocation("Mucuripe", "Rua M", { archivedAt: new Date("2026-10-01T10:00:00.000Z") });
  const stored = buildClass({
    // Tomorrow, 08:00-09:00 in Fortaleza.
    instructorIds: [A, B, ADMIN.id],
    locationId: options.storedAtArchived ? archived.id : location.id,
    notes: "Bring a hat",
    ...options.stored,
  });
  const classes = new FakeSchoolClassRepository([stored]);
  const assignments = new FakeClassAssignmentNotifier();
  const changes = new FakeClassChangeNotifier();

  if (options.failNotifiers) {
    const fail = async () => {
      throw new Error("notifier down");
    };
    assignments.classAssigned = fail;
    assignments.classUnassigned = fail;
    changes.classEdited = fail;
  }

  const audience = new FakeClassAudienceReader({ [stored.id]: options.audience ?? [] });
  audience.fail = options.failAudience ?? false;

  const useCase = new EditClass(
    classes,
    new FakeLocationRepository([location, other, archived]),
    new FakeTeacherLookup([
      { id: A, role: "instructor", status: "approved" },
      { id: B, role: "instructor", status: "approved" },
      { id: C, role: "instructor", status: "approved" },
      { id: ADMIN.id, role: "admin", status: "approved" },
      { id: STUDENT.id, role: "student", status: "approved" },
      { id: PENDING, role: "instructor", status: "pending" },
    ]),
    assignments,
    changes,
    new FakeSeatCounter(options.seatsTaken ?? 0),
    new FakeClockProvider(options.now ?? NOW),
    audience,
  );
  const input: EditClassIn = {
    actor: ADMIN,
    id: stored.id,
    discipline: "surf",
    level: "beginner",
    date: "2026-10-15",
    start: "08:00",
    end: "09:00",
    locationId: stored.locationId,
    instructorIds: [A, B, ADMIN.id],
    capacity: 8,
    notes: "Bring a hat",
  };

  return { useCase, input, classes, stored, location, other, archived, assignments, changes };
}

async function errorOf(promise: Promise<unknown>): Promise<DomainError> {
  const error = await promise.then(
    () => null,
    (e) => e,
  );
  expect(error).toBeInstanceOf(DomainError);
  return error as DomainError;
}

async function keysOf(promise: Promise<unknown>): Promise<string[]> {
  const error = (await errorOf(promise)) as ValidationException;
  expect(error).toBeInstanceOf(ValidationException);
  return error.errors.map((item) => item.message);
}

describe("EditClass", () => {
  it("edits every field", async () => {
    const { useCase, input, classes, stored, other } = setup();

    const out = await useCase.execute({
      ...input,
      discipline: "skate",
      level: "expert",
      date: "2026-10-16",
      start: "16:30",
      end: "17:45",
      locationId: other.id,
      instructorIds: [A, C],
      capacity: 12,
      notes: "  Bring water  ",
    });

    const saved = (await classes.findById(stored.id))!;
    expect(out).toEqual({ id: stored.id });
    expect(saved.discipline).toBe("skate");
    expect(saved.level).toBe("expert");
    expect(saved.startsAt).toEqual(new Date("2026-10-16T19:30:00.000Z"));
    expect(saved.endsAt).toEqual(new Date("2026-10-16T20:45:00.000Z"));
    expect(saved.locationId).toBe(other.id);
    expect(saved.instructorIds).toEqual([A, C]);
    expect(saved.capacity).toBe(12);
    expect(saved.notes).toBe("Bring water");
    expect(saved.createdBy).toBe(stored.createdBy);
    expect(saved.updatedAt).toEqual(NOW);
  });

  it("stores blank or absent notes as none", async () => {
    const blank = setup();
    await blank.useCase.execute({ ...blank.input, notes: "   " });
    expect((await blank.classes.findById(blank.stored.id))!.notes).toBeNull();

    const absent = setup();
    await absent.useCase.execute({ ...absent.input, notes: undefined });
    expect((await absent.classes.findById(absent.stored.id))!.notes).toBeNull();

    const nulled = setup();
    await nulled.useCase.execute({ ...nulled.input, notes: null });
    expect((await nulled.classes.findById(nulled.stored.id))!.notes).toBeNull();
  });

  it("counts repeated instructor ids once", async () => {
    const { useCase, input, classes, stored } = setup();

    await useCase.execute({ ...input, instructorIds: [A, A, B, ADMIN.id, B] });

    expect((await classes.findById(stored.id))!.instructorIds).toEqual([A, B, ADMIN.id]);
  });

  it("accepts a save where nothing differs and changes nothing", async () => {
    const { useCase, input, classes, stored, assignments, changes } = setup();

    await useCase.execute({ ...input, instructorIds: [ADMIN.id, B, A] });

    expect(classes.updateCalls).toHaveLength(0);
    expect(await classes.findById(stored.id)).toBe(stored);
    expect(assignments.events).toEqual([]);
    expect(assignments.unassignedEvents).toEqual([]);
    expect(changes.editedEvents).toEqual([]);
  });

  describe("deadline", () => {
    const DEADLINE = new Date("2026-10-14T20:00:00.000Z");
    const withDeadline = { cancellationDeadline: DEADLINE, deadlineRevision: 3, deadlineAttempts: 1 };

    it.each([
      ["discipline", { discipline: "skate" }],
      ["level", { level: "expert" }],
      ["start", { start: "08:30" }],
      ["end", { end: "09:30" }],
      ["capacity", { capacity: 9 }],
      ["notes", { notes: "Other" }],
    ])("clears the deadline when the %s changes", async (_field, change) => {
      const { useCase, input, classes, stored } = setup({ stored: withDeadline });

      await useCase.execute({ ...input, ...change });

      const saved = (await classes.findById(stored.id))!;
      expect(saved.cancellationDeadline).toBeNull();
      expect(saved.deadlineAttempts).toBe(0);
      expect(saved.deadlineRevision).toBe(4);
      expect(classes.clearDeadlineCalls).toEqual([true]);
    });

    it("clears the deadline when the location changes", async () => {
      const { useCase, input, classes, stored, other } = setup({ stored: withDeadline });

      await useCase.execute({ ...input, locationId: other.id });

      expect((await classes.findById(stored.id))!.cancellationDeadline).toBeNull();
    });

    it("keeps the deadline when only the instructors change", async () => {
      const { useCase, input, classes, stored } = setup({ stored: withDeadline });

      await useCase.execute({ ...input, instructorIds: [A, C] });

      const saved = (await classes.findById(stored.id))!;
      expect(saved.cancellationDeadline).toEqual(DEADLINE);
      expect(saved.deadlineRevision).toBe(3);
      expect(classes.clearDeadlineCalls).toEqual([false]);
    });

    it("keeps the deadline when nothing is saved", async () => {
      const { useCase, input, classes, stored } = setup({ stored: withDeadline });

      await useCase.execute(input);

      expect((await classes.findById(stored.id))!.cancellationDeadline).toEqual(DEADLINE);
      expect(classes.updateCalls).toHaveLength(0);
    });
  });

  describe("access and lookup", () => {
    it("refuses a student and an instructor", async () => {
      const { useCase, input, classes } = setup();

      await expect(useCase.execute({ ...input, actor: STUDENT })).rejects.toThrow(
        new ForbiddenError("user.role.notAdmin"),
      );
      await expect(useCase.execute({ ...input, actor: INSTRUCTOR })).rejects.toThrow(
        new ForbiddenError("user.role.notAdmin"),
      );
      expect(classes.updateCalls).toHaveLength(0);
    });

    it("refuses an admin who is not approved", async () => {
      const { useCase, input } = setup();

      await expect(
        useCase.execute({ ...input, actor: { ...ADMIN, status: "pending" } }),
      ).rejects.toThrow(new ForbiddenError("user.status.notApproved"));
    });

    it("refuses an unknown or malformed id with class.notFound", async () => {
      const { useCase, input } = setup();

      await expect(useCase.execute({ ...input, id: MISSING })).rejects.toThrow(
        new NotFoundError("class.notFound"),
      );
      await expect(useCase.execute({ ...input, id: "not-a-uuid" })).rejects.toThrow(
        new NotFoundError("class.notFound"),
      );
    });
  });

  describe("shape", () => {
    it.each([
      ["discipline", { discipline: "tennis" }, "class.discipline.invalid"],
      ["level", { level: "pro" }, "class.level.invalid"],
      ["a missing date", { date: undefined }, "class.date.invalid"],
      ["a malformed date", { date: "15/10/2026" }, "class.date.invalid"],
      ["an impossible date", { date: "2026-02-30" }, "class.date.invalid"],
      ["a missing start", { start: undefined }, "class.time.invalid"],
      ["a malformed end", { end: "9am" }, "class.time.invalid"],
      ["an end equal to the start", { end: "08:00" }, "class.time.endBeforeStart"],
      ["an end before the start", { end: "07:00" }, "class.time.endBeforeStart"],
      ["a capacity of zero", { capacity: 0 }, "class.capacity.invalid"],
      ["a capacity above the limit", { capacity: 21 }, "class.capacity.invalid"],
      ["a fractional capacity", { capacity: 2.5 }, "class.capacity.invalid"],
      ["notes over 300 characters", { notes: "x".repeat(301) }, "class.notes.max.length"],
      ["notes that are not text", { notes: 5 }, "class.notes.max.length"],
      ["no instructors", { instructorIds: [] }, "class.instructors.required"],
      ["instructors that are not a list", { instructorIds: "x" }, "class.instructors.required"],
      ["a blank location", { locationId: "  " }, "class.location.required"],
      ["a location that is not text", { locationId: 3 }, "class.location.required"],
    ] as const)("refuses %s", async (_name, patch, key) => {
      const { useCase, input, classes } = setup();

      expect(await keysOf(useCase.execute({ ...input, ...patch }))).toEqual([key]);
      expect(classes.updateCalls).toHaveLength(0);
    });

    it("reports every problem together", async () => {
      const { useCase, input } = setup();

      expect(
        await keysOf(
          useCase.execute({
            ...input,
            discipline: "x",
            level: "x",
            date: "x",
            start: "x",
            capacity: 0,
            notes: 1,
            instructorIds: [],
            locationId: "",
          }),
        ),
      ).toEqual([
        "class.discipline.invalid",
        "class.level.invalid",
        "class.date.invalid",
        "class.time.invalid",
        "class.capacity.invalid",
        "class.notes.max.length",
        "class.instructors.required",
        "class.location.required",
      ]);
    });

    it("accepts notes of exactly 300 characters after trimming", async () => {
      const { useCase, input, classes, stored } = setup();

      await useCase.execute({ ...input, notes: ` ${"x".repeat(300)} ` });

      expect((await classes.findById(stored.id))!.notes).toHaveLength(300);
    });

    it("answers a malformed body with its shape errors before the class state", async () => {
      const finished = setup({ now: new Date("2026-10-16T00:00:00.000Z") });

      expect(await keysOf(finished.useCase.execute({ ...finished.input, capacity: 0 }))).toEqual([
        "class.capacity.invalid",
      ]);
    });
  });

  describe("finished", () => {
    it("refuses a class whose end has passed, even with nothing changed", async () => {
      const { useCase, input, classes } = setup({ now: new Date("2026-10-15T12:00:00.000Z") });

      expect((await errorOf(useCase.execute(input))).message).toBe("class.finished");
      const error = await errorOf(useCase.execute({ ...input, capacity: 9 }));
      expect(error.message).toBe("class.finished");
      expect(error.statusCode).toBe(409);
      expect(classes.updateCalls).toHaveLength(0);
    });

    it("still edits a class one minute before its end", async () => {
      const { useCase, input, classes } = setup({ now: new Date("2026-10-15T11:59:00.000Z") });

      await useCase.execute({ ...input, instructorIds: [A, ADMIN.id] });

      expect(classes.updateCalls).toHaveLength(1);
    });
  });

  describe("cancelled", () => {
    const CANCELLED = { cancelledAt: new Date("2026-10-13T10:00:00.000Z") };

    it("refuses a cancelled class, nothing written or sent", async () => {
      const { useCase, input, classes, changes, assignments } = setup({ stored: CANCELLED });

      const error = await errorOf(useCase.execute({ ...input, capacity: 9 }));

      expect(error.message).toBe("class.cancelled");
      expect(error.statusCode).toBe(409);
      expect(classes.updateCalls).toHaveLength(0);
      expect(changes.editedEvents).toHaveLength(0);
      expect(assignments.events).toHaveLength(0);
    });

    it("answers class.cancelled for a cancelled and finished class", async () => {
      const { useCase, input } = setup({
        stored: CANCELLED,
        now: new Date("2026-10-16T00:00:00.000Z"),
      });

      expect((await errorOf(useCase.execute(input))).message).toBe("class.cancelled");
    });

    it("answers a malformed body with its shape errors before the cancellation", async () => {
      const { useCase, input } = setup({ stored: CANCELLED });

      expect(await keysOf(useCase.execute({ ...input, capacity: 0 }))).toEqual([
        "class.capacity.invalid",
      ]);
    });

    it("answers class.cancelled, notifying nobody, when the class is cancelled after it was read", async () => {
      const { useCase, input, classes, changes, assignments, stored } = setup();
      const realFindById = classes.findById.bind(classes);
      classes.findById = async (id) => {
        const found = await realFindById(id);
        await classes.cancel(stored.id, NOW, null);
        return found;
      };

      const error = await errorOf(useCase.execute({ ...input, capacity: 9 }));

      expect(error.message).toBe("class.cancelled");
      expect(error.statusCode).toBe(409);
      expect(classes.updateCalls).toHaveLength(1);
      expect((await realFindById(stored.id))!.capacity).toBe(8);
      expect(changes.editedEvents).toHaveLength(0);
      expect(assignments.events).toHaveLength(0);
    });
  });

  describe("started", () => {
    const STARTED = new Date("2026-10-15T11:30:00.000Z");

    it("changes only the instructors", async () => {
      const { useCase, input, classes, stored } = setup({ now: STARTED });

      await useCase.execute({ ...input, instructorIds: [A, C, ADMIN.id] });

      const saved = (await classes.findById(stored.id))!;
      expect(saved.instructorIds).toEqual([A, C, ADMIN.id]);
      expect(saved.startsAt).toEqual(stored.startsAt);
      expect(saved.capacity).toBe(8);
    });

    it("counts a class starting exactly now as started", async () => {
      const { useCase, input } = setup({ now: new Date("2026-10-15T11:00:00.000Z") });

      const error = await errorOf(useCase.execute({ ...input, capacity: 9 }));

      expect(error.message).toBe("class.started");
      expect(error.statusCode).toBe(409);
    });

    it.each([
      ["discipline", { discipline: "skate" }],
      ["level", { level: "expert" }],
      ["date", { date: "2026-10-16" }],
      ["start", { start: "07:00" }],
      ["end", { end: "10:00" }],
      ["location", { locationId: "other" }],
      ["capacity", { capacity: 9 }],
      ["notes", { notes: "New notes" }],
      ["notes cleared", { notes: "" }],
    ])("refuses a change of the %s", async (_name, patch) => {
      const { useCase, input, classes, other } = setup({ now: STARTED });
      const body = { ...input, ...patch };
      if (body.locationId === "other") body.locationId = other.id;

      const error = await errorOf(useCase.execute(body));

      expect(error.message).toBe("class.started");
      expect(classes.updateCalls).toHaveLength(0);
    });

    it("accepts the stored values with the same instructors and changes nothing", async () => {
      const { useCase, input, classes, assignments, changes } = setup({ now: STARTED });

      await useCase.execute(input);

      expect(classes.updateCalls).toHaveLength(0);
      expect(assignments.events).toEqual([]);
      expect(changes.editedEvents).toEqual([]);
    });

    it("does not send class.edited for an instructor swap alone", async () => {
      const { useCase, input, assignments, changes } = setup({ now: STARTED });

      await useCase.execute({ ...input, instructorIds: [A, C, ADMIN.id] });

      expect(changes.editedEvents).toEqual([]);
      expect(assignments.events).toEqual([{ instructorIds: [C], count: 1, discipline: "surf" }]);
      expect(assignments.unassignedEvents).toEqual([
        { instructorIds: [B], classId: expect.any(String), discipline: "surf", startsAt: new Date("2026-10-15T11:00:00.000Z") },
      ]);
    });
  });

  describe("location and instructors", () => {
    it("refuses an unknown location", async () => {
      const { useCase, input, classes } = setup();

      for (const locationId of [MISSING, "not-a-uuid"]) {
        expect((await errorOf(useCase.execute({ ...input, locationId }))).message).toBe(
          "class.location.notFound",
        );
      }
      expect(classes.updateCalls).toHaveLength(0);
    });

    it("refuses to move a class to an archived location (archived location)", async () => {
      const { useCase, input, classes, archived } = setup();

      const error = await errorOf(useCase.execute({ ...input, locationId: archived.id }));

      expect(error.message).toBe("class.location.archived");
      expect(error.statusCode).toBe(422);
      expect(classes.updateCalls).toHaveLength(0);
    });

    it("answers class.location.notFound before class.location.archived", async () => {
      const { useCase, input } = setup();

      expect((await errorOf(useCase.execute({ ...input, locationId: MISSING }))).message).toBe(
        "class.location.notFound",
      );
    });

    it("accepts an edit that keeps a class at a location archived since (archived location)", async () => {
      const { useCase, input, classes, archived } = setup({ storedAtArchived: true });

      await useCase.execute({ ...input, notes: "New notes" });

      expect(classes.updateCalls[0].locationId).toBe(archived.id);
      expect(classes.updateCalls[0].notes).toBe("New notes");
    });

    it.each([
      ["a student", STUDENT.id],
      ["a pending instructor", PENDING],
      ["an unknown user", MISSING],
      ["an id that is not a uuid", "nope"],
    ])("refuses to add %s", async (_name, id) => {
      const { useCase, input, classes } = setup();

      const error = await errorOf(useCase.execute({ ...input, instructorIds: [A, id] }));

      expect(error.message).toBe("class.instructors.invalid");
      expect(error.statusCode).toBe(422);
      expect(classes.updateCalls).toHaveLength(0);
    });

    it("keeps an instructor who is now a student", async () => {
      const { useCase, input, classes, stored } = setup({
        stored: { instructorIds: [STUDENT.id, A] },
      });

      await useCase.execute({ ...input, instructorIds: [STUDENT.id, A, C], capacity: 9 });

      expect((await classes.findById(stored.id))!.instructorIds).toEqual([STUDENT.id, A, C]);
    });

    it("adds an approved admin", async () => {
      const { useCase, input, classes, stored } = setup({ stored: { instructorIds: [A] } });

      await useCase.execute({ ...input, instructorIds: [A, ADMIN.id] });

      expect((await classes.findById(stored.id))!.instructorIds).toEqual([A, ADMIN.id]);
    });
  });

  describe("past", () => {
    it("refuses a start at or before now", async () => {
      const { useCase, input, classes } = setup();

      for (const [date, start, end] of [
        ["2026-10-13", "08:00", "09:00"],
        ["2026-10-14", "07:00", "08:00"],
        ["2026-10-14", "10:00", "11:00"],
      ]) {
        const error = await errorOf(useCase.execute({ ...input, date, start, end }));
        expect(error.message).toBe("class.startsAt.past");
        expect(error.statusCode).toBe(422);
      }
      expect(classes.updateCalls).toHaveLength(0);
    });

    it("accepts a start one minute after now", async () => {
      const { useCase, input, classes } = setup();

      await useCase.execute({ ...input, date: "2026-10-14", start: "10:01", end: "11:00" });

      expect(classes.updateCalls).toHaveLength(1);
    });

    it("keeps the class's own future start", async () => {
      const { useCase, input, classes } = setup();

      await useCase.execute({ ...input, capacity: 10 });

      expect(classes.updateCalls).toHaveLength(1);
    });
  });

  describe("seats taken", () => {
    it("refuses a capacity below the seats taken", async () => {
      const { useCase, input, classes } = setup({ seatsTaken: 8 });

      const error = await errorOf(useCase.execute({ ...input, capacity: 6 }));

      expect(error.message).toBe("class.capacity.belowSeatsTaken");
      expect(error.statusCode).toBe(422);
      expect(error.details).toEqual({ seatsTaken: 8 });
      expect(classes.updateCalls).toHaveLength(0);
    });

    it("accepts a capacity equal to the seats taken", async () => {
      const { useCase, input, classes, stored } = setup({ seatsTaken: 8 });

      await useCase.execute({ ...input, capacity: 8, notes: "Changed" });

      expect(classes.updateCalls).toHaveLength(1);
      expect((await classes.findById(stored.id))!.capacity).toBe(8);
    });
  });

  describe("notifies students", () => {
    const S1 = "7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d";
    const S2 = "8b9c0d1e-2f3a-4b4c-9d5e-6f7a8b9c0d1e";
    const startsAt = new Date("2026-10-15T12:00:00.000Z");

    it("tells the students and pending requests together with the kept instructors", async () => {
      const { useCase, input, stored, changes } = setup({ audience: [S1, S2] });

      await useCase.execute({ ...input, start: "09:00", end: "10:00" });

      expect(changes.editedEvents).toEqual([
        {
          instructorIds: [A, B],
          studentIds: [S1, S2],
          classId: stored.id,
          discipline: "surf",
          startsAt,
        },
      ]);
    });

    it("tells the students when no instructor is kept", async () => {
      const { useCase, input, changes } = setup({ audience: [S1], stored: { instructorIds: [ADMIN.id] } });

      await useCase.execute({ ...input, instructorIds: [ADMIN.id], capacity: 9 });

      expect(changes.editedEvents).toEqual([expect.objectContaining({ instructorIds: [], studentIds: [S1] })]);
    });

    it("never tells the editing admin when they hold a seat", async () => {
      const { useCase, input, changes } = setup({ audience: [ADMIN.id, S1] });

      await useCase.execute({ ...input, capacity: 9 });

      expect(changes.editedEvents[0]!.studentIds).toEqual([S1]);
    });

    it("tells no student when only the instructors change", async () => {
      const { useCase, input, changes } = setup({ audience: [S1] });

      await useCase.execute({ ...input, instructorIds: [A, C, ADMIN.id] });

      expect(changes.editedEvents).toEqual([]);
    });

    it("tells nobody on an unchanged save", async () => {
      const { useCase, input, changes } = setup({ audience: [S1] });

      await useCase.execute(input);

      expect(changes.editedEvents).toEqual([]);
    });

    it("tells the instructors only when the students can't be read", async () => {
      const { useCase, input, changes } = setup({ audience: [S1], failAudience: true });

      await useCase.execute({ ...input, capacity: 9 });

      expect(changes.editedEvents).toEqual([expect.objectContaining({ instructorIds: [A, B] })]);
      expect(changes.editedEvents[0]).not.toHaveProperty("studentIds");
    });
  });

  describe("notifies", () => {
    it("tells kept, added and removed instructors, never the editing admin", async () => {
      const { useCase, input, stored, assignments, changes } = setup();

      await useCase.execute({
        ...input,
        start: "09:00",
        end: "10:00",
        instructorIds: [A, C, ADMIN.id],
      });

      const startsAt = new Date("2026-10-15T12:00:00.000Z");
      expect(changes.editedEvents).toEqual([
        { instructorIds: [A], classId: stored.id, discipline: "surf", startsAt },
      ]);
      expect(assignments.events).toEqual([{ instructorIds: [C], count: 1, discipline: "surf" }]);
      expect(assignments.unassignedEvents).toEqual([
        { instructorIds: [B], classId: stored.id, discipline: "surf", startsAt },
      ]);
    });

    it("carries the new discipline in every event", async () => {
      const { useCase, input, assignments, changes } = setup();

      await useCase.execute({ ...input, discipline: "skate", instructorIds: [A, C] });

      expect(changes.editedEvents[0]!.discipline).toBe("skate");
      expect(assignments.events[0]!.discipline).toBe("skate");
      expect(assignments.unassignedEvents[0]!.discipline).toBe("skate");
    });

    it("sends only class.assigned and class.unassigned when only the instructors change", async () => {
      const { useCase, input, assignments, changes } = setup();

      await useCase.execute({ ...input, instructorIds: [A, C, ADMIN.id] });

      expect(changes.editedEvents).toEqual([]);
      expect(assignments.events).toHaveLength(1);
      expect(assignments.unassignedEvents).toHaveLength(1);
    });

    it("sends nothing to an editing admin who is the only instructor kept", async () => {
      const { useCase, input, assignments, changes } = setup({ stored: { instructorIds: [ADMIN.id] } });

      await useCase.execute({ ...input, instructorIds: [ADMIN.id], capacity: 9 });

      expect(changes.editedEvents).toEqual([]);
      expect(assignments.events).toEqual([]);
      expect(assignments.unassignedEvents).toEqual([]);
    });

    it("does not tell anyone about a removed or added admin who is the editor", async () => {
      const { useCase, input, assignments } = setup();

      await useCase.execute({ ...input, instructorIds: [A, B] });

      expect(assignments.unassignedEvents).toEqual([]);
    });

    it("answers 200 and stores the class even when every notifier throws", async () => {
      const { useCase, input, classes, stored } = setup({ failNotifiers: true });

      await expect(
        useCase.execute({ ...input, capacity: 9, instructorIds: [A, C] }),
      ).resolves.toEqual({ id: stored.id });
      expect((await classes.findById(stored.id))!.capacity).toBe(9);
    });
  });
});
