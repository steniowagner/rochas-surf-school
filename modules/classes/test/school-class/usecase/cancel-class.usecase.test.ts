import {
  DomainError,
  ForbiddenError,
  NotFoundError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { CancelClass } from "../../../src";
import {
  ADMIN,
  buildClass,
  FakeClassChangeNotifier,
  FakeClockProvider,
  FakeSchoolClassRepository,
  INSTRUCTOR,
  STUDENT,
} from "../../mock";

const NOW = new Date("2026-10-14T13:00:00.000Z"); // 10:00 in Fortaleza
const A = INSTRUCTOR.id;
const MISSING = "11111111-1111-4111-8111-111111111111";

interface Options {
  now?: Date;
  stored?: Parameters<typeof buildClass>[0];
  failNotifier?: boolean;
}

function setup(options: Options = {}) {
  const stored = buildClass({
    // Tomorrow, 08:00-09:00 in Fortaleza.
    instructorIds: [A, ADMIN.id],
    ...options.stored,
  });
  const classes = new FakeSchoolClassRepository([stored]);
  const changes = new FakeClassChangeNotifier();

  if (options.failNotifier) {
    changes.classCancelled = async () => {
      throw new Error("notifier down");
    };
  }

  const useCase = new CancelClass(classes, changes, new FakeClockProvider(options.now ?? NOW));

  return { useCase, classes, changes, stored, input: { actor: ADMIN, id: stored.id } };
}

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (error) => error,
  );
}

describe("CancelClass", () => {
  it("cancels a class that hasn't started, trimming the message", async () => {
    const { useCase, input, classes, stored } = setup();

    const out = await useCase.execute({ ...input, message: "  Mar muito grande.  " });

    expect(out).toEqual({ id: stored.id });
    const saved = (await classes.findById(stored.id))!;
    expect(saved.cancelledAt).toEqual(NOW);
    expect(saved.cancellationMessage).toBe("Mar muito grande.");
  });

  it.each([[undefined], [null], [""], ["   "]])("cancels with no message for %j", async (message) => {
    const { useCase, input, classes, stored } = setup();

    await useCase.execute({ ...input, message });

    const saved = (await classes.findById(stored.id))!;
    expect(saved.cancelledAt).toEqual(NOW);
    expect(saved.cancellationMessage).toBeNull();
  });

  it("accepts a message of exactly 300 characters", async () => {
    const { useCase, input, classes, stored } = setup();

    await useCase.execute({ ...input, message: ` ${"m".repeat(300)} ` });

    expect((await classes.findById(stored.id))!.cancellationMessage).toBe("m".repeat(300));
  });

  it("cancels a started class, even at the exact start", async () => {
    const started = setup({ now: new Date("2026-10-15T11:30:00.000Z") });
    const atStart = setup({ now: new Date("2026-10-15T11:00:00.000Z") });

    await started.useCase.execute(started.input);
    await atStart.useCase.execute(atStart.input);

    expect((await started.classes.findById(started.stored.id))!.cancelledAt).not.toBeNull();
    expect((await atStart.classes.findById(atStart.stored.id))!.cancelledAt).not.toBeNull();
  });

  it("refuses a finished class, even at the exact end, and changes nothing", async () => {
    const { useCase, input, classes, changes } = setup({ now: new Date("2026-10-15T12:00:00.000Z") });

    const error = await errorOf(useCase.execute(input));

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ message: "class.finished", statusCode: 409 });
    expect(classes.cancelCalls).toEqual([]);
    expect(changes.cancelledEvents).toEqual([]);
  });

  it("refuses an already cancelled class with class.cancelled, even once finished", async () => {
    const cancelledAt = new Date("2026-10-13T10:00:00.000Z");
    const { useCase, input, classes, changes, stored } = setup({
      now: new Date("2026-10-16T12:00:00.000Z"),
      stored: { cancelledAt, cancellationMessage: "Primeira" },
    });

    const error = await errorOf(useCase.execute({ ...input, message: "Segunda" }));

    expect(error).toMatchObject({ message: "class.cancelled", statusCode: 409 });
    const saved = (await classes.findById(stored.id))!;
    expect(saved.cancelledAt).toEqual(cancelledAt);
    expect(saved.cancellationMessage).toBe("Primeira");
    expect(changes.cancelledEvents).toEqual([]);
  });

  it("refuses with class.cancelled when the write loses the race, notifying nobody", async () => {
    const { useCase, input, classes, changes } = setup();
    classes.cancel = async () => false;

    const error = await errorOf(useCase.execute(input));

    expect(error).toMatchObject({ message: "class.cancelled", statusCode: 409 });
    expect(changes.cancelledEvents).toEqual([]);
  });

  it("answers exactly one winner for two simultaneous cancels", async () => {
    const { useCase, input } = setup();

    const results = await Promise.all([
      errorOf(useCase.execute(input)),
      errorOf(useCase.execute(input)),
    ]);

    expect(results.filter((result) => result === null)).toHaveLength(1);
    expect(results.filter((result) => (result as DomainError | null)?.message === "class.cancelled")).toHaveLength(1);
  });

  it.each([[STUDENT, "user.role.notAdmin"], [INSTRUCTOR, "user.role.notAdmin"]])(
    "checks access: %j",
    async (actor, key) => {
      const { useCase, input, classes } = setup();

      const error = await errorOf(useCase.execute({ ...input, actor }));

      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error).toMatchObject({ message: key });
      expect(classes.cancelCalls).toEqual([]);
    },
  );

  it("checks access: a non-approved admin is refused first", async () => {
    const { useCase, input } = setup();

    const error = await errorOf(
      useCase.execute({ ...input, actor: { ...ADMIN, status: "pending" }, id: "not-a-uuid" }),
    );

    expect(error).toMatchObject({ message: "user.status.notApproved" });
  });

  it("checks the id: an unknown or non-UUID id is class.notFound", async () => {
    const { useCase, input } = setup();

    for (const id of [MISSING, "not-a-uuid"]) {
      const error = await errorOf(useCase.execute({ ...input, id }));

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error).toMatchObject({ message: "class.notFound" });
    }
  });

  it.each([["m".repeat(301)], [` ${"m".repeat(301)}`], [42], [{}], [["a"]]])(
    "checks the message: %j is refused and nothing is stored or sent",
    async (message) => {
      const { useCase, input, classes, changes } = setup();

      const error = await errorOf(useCase.execute({ ...input, message }));

      expect(error).toBeInstanceOf(ValidationException);
      expect((error as ValidationException).errors.map((item) => item.message)).toEqual([
        "class.cancellationMessage.max.length",
      ]);
      expect(classes.cancelCalls).toEqual([]);
      expect(changes.cancelledEvents).toEqual([]);
    },
  );

  it("checks the message before the state", async () => {
    const { useCase, input } = setup({ now: new Date("2026-10-16T12:00:00.000Z") });

    const error = await errorOf(useCase.execute({ ...input, message: 42 }));

    expect(error).toBeInstanceOf(ValidationException);
  });

  it("notifies the instructors except the admin who cancels, with the message", async () => {
    const { useCase, input, changes, stored } = setup();

    await useCase.execute({ ...input, message: " Mar muito grande. " });

    expect(changes.cancelledEvents).toEqual([
      {
        instructorIds: [A],
        classId: stored.id,
        discipline: "surf",
        startsAt: stored.startsAt,
        message: "Mar muito grande.",
      },
    ]);
  });

  it("notifies without a message when there is none", async () => {
    const { useCase, input, changes } = setup();

    await useCase.execute(input);

    expect(changes.cancelledEvents).toHaveLength(1);
    expect(changes.cancelledEvents[0]).not.toHaveProperty("message");
  });

  it("notifies nobody when the admin is the only instructor", async () => {
    const { useCase, input, changes } = setup({ stored: { instructorIds: [ADMIN.id] } });

    await useCase.execute(input);

    expect(changes.cancelledEvents).toEqual([]);
  });

  it("notifies: a notifier that throws changes neither the answer nor the cancellation", async () => {
    const { useCase, input, classes, stored } = setup({ failNotifier: true });

    await expect(useCase.execute(input)).resolves.toEqual({ id: stored.id });
    expect((await classes.findById(stored.id))!.cancelledAt).toEqual(NOW);
  });
});
