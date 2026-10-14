import { DomainError, ForbiddenError, ValidationException } from "@rochas-surf-school/shared";
import { CreateClassBatch, CreateClassBatchIn } from "../../../src";
import {
  ADMIN,
  buildLocation,
  FakeClassAssignmentNotifier,
  FakeClockProvider,
  FakeLocationRepository,
  FakeSchoolClassRepository,
  FakeTeacherLookup,
  INSTRUCTOR,
  STUDENT,
} from "../../mock";

const NOW = new Date("2026-10-14T13:00:00.000Z"); // 10:00 in Fortaleza
const INSTRUCTOR_ID = INSTRUCTOR.id;
const OTHER_ID = "9b8c7d6e-5f4a-4321-8abc-0d1e2f3a4b5c";

function setup(overrides: { failNotifier?: boolean } = {}) {
  const location = buildLocation("Praia do Futuro");
  const classes = new FakeSchoolClassRepository();
  const notifier = new FakeClassAssignmentNotifier();
  if (overrides.failNotifier) {
    notifier.classAssigned = async () => {
      throw new Error("notifier down");
    };
  }
  const useCase = new CreateClassBatch(
    classes,
    new FakeLocationRepository([location]),
    new FakeTeacherLookup([
      { id: INSTRUCTOR_ID, role: "instructor", status: "approved" },
      { id: ADMIN.id, role: "admin", status: "approved" },
      { id: OTHER_ID, role: "instructor", status: "approved" },
      { id: STUDENT.id, role: "student", status: "approved" },
      { id: "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b", role: "instructor", status: "pending" },
    ]),
    notifier,
    new FakeClockProvider(NOW),
  );
  const input: CreateClassBatchIn = {
    actor: ADMIN,
    discipline: "surf",
    level: "beginner",
    startDate: "2026-10-15",
    endDate: "2026-10-17",
    weekdays: [3, 4, 5],
    timeRanges: [
      { start: "08:00", end: "09:00" },
      { start: "16:00", end: "17:00" },
    ],
    locationId: location.id,
    instructorIds: [INSTRUCTOR_ID],
    capacity: 8,
    notes: "  Bring sunscreen  ",
  };

  return { useCase, input, classes, notifier, location };
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

describe("CreateClassBatch", () => {
  it("creates one class per included day and time range", async () => {
    const { useCase, input, classes, location } = setup();

    const out = await useCase.execute(input);

    expect(out).toEqual({ count: 4 });
    expect(
      classes.all.map((item) => [item.startsAt.toISOString(), item.endsAt.toISOString()]),
    ).toEqual([
      ["2026-10-15T11:00:00.000Z", "2026-10-15T12:00:00.000Z"],
      ["2026-10-15T19:00:00.000Z", "2026-10-15T20:00:00.000Z"],
      ["2026-10-16T11:00:00.000Z", "2026-10-16T12:00:00.000Z"],
      ["2026-10-16T19:00:00.000Z", "2026-10-16T20:00:00.000Z"],
    ]);
    for (const item of classes.all) {
      expect(item.discipline).toBe("surf");
      expect(item.level).toBe("beginner");
      expect(item.locationId).toBe(location.id);
      expect(item.capacity).toBe(8);
      expect(item.notes).toBe("Bring sunscreen");
      expect(item.instructorIds).toEqual([INSTRUCTOR_ID]);
      expect(item.createdBy).toBe(ADMIN.id);
    }
    expect(classes.createManyCalls).toHaveLength(1);
  });

  it("creates one class per range for a one-day batch with every weekday", async () => {
    const { useCase, input, classes } = setup();

    const out = await useCase.execute({
      ...input,
      startDate: "2026-10-14",
      endDate: "2026-10-14",
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      timeRanges: [{ start: "16:00", end: "17:00" }],
    });

    expect(out).toEqual({ count: 1 });
    expect(classes.all).toHaveLength(1);
  });

  it("keeps one assignment for a repeated instructor id", async () => {
    const { useCase, input, classes } = setup();

    await useCase.execute({ ...input, instructorIds: [INSTRUCTOR_ID, INSTRUCTOR_ID] });

    expect(classes.all[0].instructorIds).toEqual([INSTRUCTOR_ID]);
  });

  it.each([undefined, null, "", "   "])("stores blank notes %j as none", async (notes) => {
    const { useCase, input, classes } = setup();

    await useCase.execute({ ...input, notes });

    expect(classes.all[0].notes).toBeNull();
  });

  it("accepts notes of 300 characters and touching time ranges", async () => {
    const { useCase, input } = setup();

    await expect(
      useCase.execute({
        ...input,
        notes: "n".repeat(300),
        timeRanges: [
          { start: "08:00", end: "09:00" },
          { start: "09:00", end: "10:00" },
        ],
      }),
    ).resolves.toEqual({ count: 4 });
  });

  it("creates classes that overlap those of an earlier batch", async () => {
    const { useCase, input, classes } = setup();

    await useCase.execute(input);
    await useCase.execute(input);

    expect(classes.all).toHaveLength(8);
  });

  describe("access", () => {
    it.each(["pending", "denied", "deleted", "removed"] as const)(
      "refuses an account that is %s first",
      async (status) => {
        const { useCase, input, classes } = setup();

        const error = await errorOf(
          useCase.execute({ ...input, actor: { ...ADMIN, status }, capacity: 0 }),
        );

        expect(error).toBeInstanceOf(ForbiddenError);
        expect(error.message).toBe("user.status.notApproved");
        expect(classes.all).toHaveLength(0);
      },
    );

    it.each([STUDENT, INSTRUCTOR])("refuses an approved $role", async (actor) => {
      const { useCase, input, classes } = setup();

      const error = await errorOf(useCase.execute({ ...input, actor }));

      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.message).toBe("user.role.notAdmin");
      expect(classes.all).toHaveLength(0);
    });
  });

  describe("shape", () => {
    it.each<[string, Partial<CreateClassBatchIn>, string[]]>([
      ["discipline", { discipline: "tennis" }, ["class.discipline.invalid"]],
      ["level", { level: undefined }, ["class.level.invalid"]],
      ["malformed date", { startDate: "15/10/2026" }, ["class.dates.invalid"]],
      ["impossible date", { endDate: "2026-02-30" }, ["class.dates.invalid"]],
      ["end before start", { startDate: "2026-10-17", endDate: "2026-10-15" }, ["class.dates.invalid"]],
      ["empty weekdays", { weekdays: [] }, ["class.weekdays.invalid"]],
      ["weekday 8", { weekdays: [8] }, ["class.weekdays.invalid"]],
      ["missing ranges", { timeRanges: undefined }, ["class.timeRanges.required"]],
      ["empty ranges", { timeRanges: [] }, ["class.timeRanges.required"]],
      ["malformed time", { timeRanges: [{ start: "8:00", end: "09:00" }] }, ["class.timeRanges.invalid"]],
      ["non-object range", { timeRanges: ["08:00"] }, ["class.timeRanges.invalid"]],
      ["end before start range", { timeRanges: [{ start: "10:00", end: "09:00" }] }, ["class.timeRanges.endBeforeStart"]],
      ["end equal start range", { timeRanges: [{ start: "09:00", end: "09:00" }] }, ["class.timeRanges.endBeforeStart"]],
      [
        "overlap",
        { timeRanges: [{ start: "08:00", end: "09:00" }, { start: "08:30", end: "09:30" }] },
        ["class.timeRanges.overlap"],
      ],
      ["capacity 0", { capacity: 0 }, ["class.capacity.invalid"]],
      ["capacity 21", { capacity: 21 }, ["class.capacity.invalid"]],
      ["capacity 2.5", { capacity: 2.5 }, ["class.capacity.invalid"]],
      ["capacity string", { capacity: "8" }, ["class.capacity.invalid"]],
      ["notes 301", { notes: "n".repeat(301) }, ["class.notes.max.length"]],
      ["notes padded to 301", { notes: ` ${"n".repeat(300)} ` }, []],
      ["notes not a string", { notes: 5 }, ["class.notes.max.length"]],
      ["no instructors", { instructorIds: [] }, ["class.instructors.required"]],
      ["instructors not a list", { instructorIds: INSTRUCTOR_ID }, ["class.instructors.required"]],
      ["no location", { locationId: undefined }, ["class.location.required"]],
      ["blank location", { locationId: "  " }, ["class.location.required"]],
      ["location not a string", { locationId: 5 }, ["class.location.required"]],
    ])("refuses %s and stores nothing", async (_name, patch, expected) => {
      const { useCase, input, classes, notifier } = setup();

      if (expected.length === 0) {
        await expect(useCase.execute({ ...input, ...patch })).resolves.toEqual({ count: 4 });
        return;
      }

      expect(await keysOf(useCase.execute({ ...input, ...patch }))).toEqual(expected);
      expect(classes.all).toHaveLength(0);
      expect(notifier.events).toHaveLength(0);
    });

    it("collects every failure into one answer", async () => {
      const { useCase, input } = setup();

      const keys = await keysOf(
        useCase.execute({
          ...input,
          discipline: "x",
          level: "x",
          timeRanges: [
            { start: "10:00", end: "09:00" },
            { start: "bad", end: "09:00" },
          ],
          capacity: 0,
          instructorIds: [],
        }),
      );

      expect(keys).toEqual([
        "class.discipline.invalid",
        "class.level.invalid",
        "class.timeRanges.invalid",
        "class.timeRanges.endBeforeStart",
        "class.capacity.invalid",
        "class.instructors.required",
      ]);
    });
  });

  describe("business checks", () => {
    it("refuses a location that does not exist, or is not an id", async () => {
      const { useCase, input, classes } = setup();

      for (const locationId of [OTHER_ID, "not-a-uuid"]) {
        const error = await errorOf(useCase.execute({ ...input, locationId }));
        expect(error.message).toBe("class.location.notFound");
        expect(error.statusCode).toBe(422);
      }
      expect(classes.all).toHaveLength(0);
    });

    it.each([
      ["a student", [STUDENT.id]],
      ["a pending instructor", ["e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b"]],
      ["an unknown user", ["aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"]],
      ["an id that is not a uuid", ["nope"]],
      ["a value that is not a string", [5]],
      ["a valid and an invalid instructor", [INSTRUCTOR_ID, STUDENT.id]],
    ])("refuses %s", async (_name, instructorIds) => {
      const { useCase, input, classes } = setup();

      const error = await errorOf(useCase.execute({ ...input, instructorIds }));

      expect(error.message).toBe("class.instructors.invalid");
      expect(error.statusCode).toBe(422);
      expect(classes.all).toHaveLength(0);
    });

    it("accepts admins as instructors", async () => {
      const { useCase, input } = setup();

      await expect(
        useCase.execute({ ...input, instructorIds: [ADMIN.id] }),
      ).resolves.toEqual({ count: 4 });
    });

    it("checks the location before the instructors", async () => {
      const { useCase, input } = setup();

      const error = await errorOf(
        useCase.execute({ ...input, locationId: OTHER_ID, instructorIds: [STUDENT.id] }),
      );

      expect(error.message).toBe("class.location.notFound");
    });

    it("checks the instructors before the batch size", async () => {
      const { useCase, input } = setup();

      const error = await errorOf(
        useCase.execute({ ...input, instructorIds: [STUDENT.id], weekdays: [1], startDate: "2026-10-19", endDate: "2026-10-19" }),
      );

      expect(error.message).toBe("class.instructors.invalid");
    });

    it("refuses weekdays that exclude every date", async () => {
      const { useCase, input, classes } = setup();

      const error = await errorOf(useCase.execute({ ...input, weekdays: [7] }));

      expect(error.message).toBe("class.batch.empty");
      expect(error.statusCode).toBe(422);
      expect(classes.all).toHaveLength(0);
    });

    it("refuses more than 200 classes with the limit in the details", async () => {
      const { useCase, input, classes } = setup();
      const timeRanges = Array.from({ length: 5 }, (_, index) => ({
        start: `${String(index + 6).padStart(2, "0")}:00`,
        end: `${String(index + 6).padStart(2, "0")}:30`,
      }));

      const error = await errorOf(
        useCase.execute({
          ...input,
          startDate: "2026-10-15",
          endDate: "2027-12-31",
          weekdays: [1, 2, 3, 4, 5, 6, 7],
          timeRanges,
        }),
      );

      expect(error.message).toBe("class.batch.tooLarge");
      expect(error.statusCode).toBe(422);
      expect(error.details).toEqual({ max: 200 });
      expect(classes.all).toHaveLength(0);
    });

    it("accepts exactly 200 classes", async () => {
      const { useCase, input, classes } = setup();

      const out = await useCase.execute({
        ...input,
        startDate: "2026-10-15",
        endDate: "2027-01-22",
        weekdays: [1, 2, 3, 4, 5, 6, 7],
        timeRanges: [{ start: "08:00", end: "09:00" }, { start: "10:00", end: "11:00" }],
      });

      expect(out).toEqual({ count: 200 });
      expect(classes.all).toHaveLength(200);
    });
  });

  describe("the past", () => {
    it("refuses the whole batch when one class has started, storing none", async () => {
      const { useCase, input, classes, notifier } = setup();

      const error = await errorOf(
        useCase.execute({
          ...input,
          startDate: "2026-10-14",
          endDate: "2026-10-16",
          weekdays: [1, 2, 3, 4, 5, 6, 7],
          timeRanges: [
            { start: "08:00", end: "09:00" },
            { start: "16:00", end: "17:00" },
          ],
        }),
      );

      expect(error.message).toBe("class.startsAt.past");
      expect(error.statusCode).toBe(422);
      expect(classes.all).toHaveLength(0);
      expect(notifier.events).toHaveLength(0);
    });

    it("refuses a class that starts exactly now", async () => {
      const { useCase, input } = setup();

      const error = await errorOf(
        useCase.execute({
          ...input,
          startDate: "2026-10-14",
          endDate: "2026-10-14",
          weekdays: [3],
          timeRanges: [{ start: "10:00", end: "11:00" }],
        }),
      );

      expect(error.message).toBe("class.startsAt.past");
    });

    it("creates the same batch starting tomorrow", async () => {
      const { useCase, input } = setup();

      await expect(
        useCase.execute({
          ...input,
          startDate: "2026-10-15",
          endDate: "2026-10-16",
          weekdays: [1, 2, 3, 4, 5, 6, 7],
        }),
      ).resolves.toEqual({ count: 4 });
    });
  });

  describe("all or nothing", () => {
    it("stores nothing and notifies nobody when the write fails", async () => {
      const { useCase, input, classes, notifier } = setup();
      classes.failNextCreate = true;

      await expect(useCase.execute(input)).rejects.toThrow("createMany failed");

      expect(classes.all).toHaveLength(0);
      expect(notifier.events).toHaveLength(0);
    });
  });

  describe("notifications", () => {
    it("tells each instructor once per batch, except the creator", async () => {
      const { useCase, input, notifier } = setup();

      await useCase.execute({
        ...input,
        instructorIds: [INSTRUCTOR_ID, ADMIN.id, OTHER_ID, INSTRUCTOR_ID],
      });

      expect(notifier.events).toEqual([
        { instructorIds: [INSTRUCTOR_ID, OTHER_ID], count: 4, discipline: "surf" },
      ]);
    });

    it("does not notify when the creator is the only instructor", async () => {
      const { useCase, input, notifier } = setup();

      await useCase.execute({ ...input, instructorIds: [ADMIN.id], discipline: "skate" });

      expect(notifier.events).toHaveLength(0);
    });

    it("keeps the answer and the classes when the notifier throws", async () => {
      const { useCase, input, classes } = setup({ failNotifier: true });

      await expect(useCase.execute(input)).resolves.toEqual({ count: 4 });
      expect(classes.all).toHaveLength(4);
    });
  });
});
