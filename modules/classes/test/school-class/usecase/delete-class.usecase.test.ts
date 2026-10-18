import { DomainError, ForbiddenError, NotFoundError } from "@rochas-surf-school/shared";
import { DeleteClass } from "../../../src";
import {
  ADMIN,
  buildClass,
  FakeClassChangeNotifier,
  FakeClockProvider,
  FakePendingRequestCounter,
  FakeSchoolClassRepository,
  FakeSeatCounter,
  INSTRUCTOR,
  STUDENT,
} from "../../mock";

const NOW = new Date("2026-10-14T13:00:00.000Z"); // 10:00 in Fortaleza
const A = INSTRUCTOR.id;
const MISSING = "11111111-1111-4111-8111-111111111111";

interface Options {
  now?: Date;
  stored?: Parameters<typeof buildClass>[0];
  seatsTaken?: number;
  pendingRequests?: number;
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
    changes.classDeleted = async () => {
      throw new Error("notifier down");
    };
  }

  const useCase = new DeleteClass(
    classes,
    new FakeSeatCounter(options.seatsTaken),
    new FakePendingRequestCounter(options.pendingRequests),
    changes,
    new FakeClockProvider(options.now ?? NOW),
  );

  return { useCase, classes, changes, stored, input: { actor: ADMIN, id: stored.id } };
}

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (error) => error,
  );
}

describe("DeleteClass", () => {
  it("deletes a class that hasn't started, with nobody in it, and answers nothing", async () => {
    const { useCase, input, classes } = setup();
    const other = buildClass();
    await classes.createMany([other]);

    expect(await useCase.execute(input)).toBeUndefined();

    expect(await classes.findById(input.id)).toBeNull();
    expect(await classes.findById(other.id)).toBe(other);
    expect(classes.deleteCalls).toEqual([{ id: input.id, now: NOW }]);
  });

  it("deletes a class starting one minute after now", async () => {
    const { useCase, input, classes } = setup({ now: new Date("2026-10-15T10:59:00.000Z") });

    await useCase.execute(input);

    expect(classes.all).toEqual([]);
  });

  it.each([
    ["started", new Date("2026-10-15T11:30:00.000Z")],
    ["at its exact start", new Date("2026-10-15T11:00:00.000Z")],
    ["finished", new Date("2026-10-16T12:00:00.000Z")],
  ])("refuses a class that is %s with class.started and keeps it", async (_label, now) => {
    const { useCase, input, classes, changes } = setup({ now });

    const error = await errorOf(useCase.execute(input));

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ message: "class.started", statusCode: 409 });
    expect(classes.all).toHaveLength(1);
    expect(classes.deleteCalls).toEqual([]);
    expect(changes.deletedEvents).toEqual([]);
  });

  it("refuses a cancelled class with class.cancelled, even once started or finished", async () => {
    const { useCase, input, classes, changes } = setup({
      now: new Date("2026-10-16T12:00:00.000Z"),
      stored: { cancelledAt: new Date("2026-10-13T10:00:00.000Z") },
    });

    const error = await errorOf(useCase.execute(input));

    expect(error).toMatchObject({ message: "class.cancelled", statusCode: 409 });
    expect(classes.all).toHaveLength(1);
    expect(changes.deletedEvents).toEqual([]);
  });

  it.each([
    [2, 0],
    [0, 1],
    [3, 4],
  ])("refuses a class that is not empty (%i seats, %i pending) and deletes nothing", async (seatsTaken, pendingRequests) => {
    const { useCase, input, classes, changes } = setup({ seatsTaken, pendingRequests });

    const error = await errorOf(useCase.execute(input));

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({
      message: "class.delete.notEmpty",
      statusCode: 409,
      details: { seatsTaken, pendingRequests },
    });
    expect(classes.deleteCalls).toEqual([]);
    expect(classes.all).toHaveLength(1);
    expect(changes.deletedEvents).toEqual([]);
  });

  it("checks cancelled and started before the counts", async () => {
    const { useCase, input } = setup({
      now: new Date("2026-10-15T11:30:00.000Z"),
      seatsTaken: 2,
    });

    expect(await errorOf(useCase.execute(input))).toMatchObject({ message: "class.started" });
  });

  it("answers class.notFound for a race lost to a delete, since the class is gone", async () => {
    const { useCase, input, classes, changes } = setup();
    const realDelete = classes.delete.bind(classes);
    classes.delete = async (id, now) => {
      await realDelete(id, now);
      return false;
    };

    const error = await errorOf(useCase.execute(input));

    expect(error).toBeInstanceOf(NotFoundError);
    expect(error).toMatchObject({ message: "class.notFound" });
    expect(changes.deletedEvents).toEqual([]);
  });

  it("refuses with class.cancelled when a cancel wins the race, notifying nobody", async () => {
    const { useCase, input, classes, changes } = setup();
    classes.delete = async (id) => {
      await classes.cancel(id, NOW, null);
      return false;
    };

    const error = await errorOf(useCase.execute(input));

    expect(error).toMatchObject({ message: "class.cancelled", statusCode: 409 });
    expect(changes.deletedEvents).toEqual([]);
  });

  it("refuses with class.started when the class starts during the race", async () => {
    const { useCase, input, classes, changes } = setup();
    classes.delete = async () => false;

    const error = await errorOf(useCase.execute(input));

    expect(error).toMatchObject({ message: "class.started", statusCode: 409 });
    expect(changes.deletedEvents).toEqual([]);
  });

  it("answers exactly one winner and one class.notFound for two simultaneous deletes", async () => {
    const { useCase, input } = setup();

    const results = await Promise.all([
      errorOf(useCase.execute(input)),
      errorOf(useCase.execute(input)),
    ]);

    expect(results.filter((result) => result === null)).toHaveLength(1);
    expect(
      results.filter((result) => (result as NotFoundError | null)?.message === "class.notFound"),
    ).toHaveLength(1);
  });

  it("notifies the instructors except the admin who deletes, with the values read before deleting", async () => {
    const { useCase, input, changes, stored } = setup();

    await useCase.execute(input);

    expect(changes.deletedEvents).toEqual([
      { instructorIds: [A], discipline: stored.discipline, startsAt: stored.startsAt },
    ]);
  });

  it("notifies nobody when the admin is the only instructor", async () => {
    const { useCase, input, changes } = setup({ stored: { instructorIds: [ADMIN.id] } });

    await useCase.execute(input);

    expect(changes.deletedEvents).toEqual([]);
  });

  it("notifies nothing but still deletes when the notifier throws", async () => {
    const { useCase, input, classes } = setup({ failNotifier: true });

    expect(await errorOf(useCase.execute(input))).toBeNull();
    expect(classes.all).toEqual([]);
  });

  it.each([[STUDENT], [INSTRUCTOR]])("checks access: %j is not an admin", async (actor) => {
    const { useCase, input, classes } = setup();

    const error = await errorOf(useCase.execute({ ...input, actor }));

    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error).toMatchObject({ message: "user.role.notAdmin" });
    expect(classes.deleteCalls).toEqual([]);
  });

  it("checks access: a non-approved admin is refused first", async () => {
    const { useCase, input } = setup();

    const error = await errorOf(
      useCase.execute({ actor: { ...ADMIN, status: "pending" }, id: input.id }),
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
});
