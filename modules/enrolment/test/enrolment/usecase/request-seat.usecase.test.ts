import type { SeatCounter } from "@rochas-surf-school/classes";
import { ConflictError, ForbiddenError, NotFoundError } from "@rochas-surf-school/shared";
import { RequestSeat } from "../../../src";
import {
  ADMIN,
  buildEnrolment,
  buildEnrolmentClass,
  CLASS_ID,
  FakeClockProvider,
  FakeEnrolmentClassReader,
  FakeEnrolmentNotifier,
  FakeEnrolmentRepository,
  FakeStudentNameReader,
  FakeWaitingListSetting,
  INSTRUCTOR,
  NOW,
  STUDENT,
  TOMORROW,
} from "../../mock";

interface Options {
  now?: Date;
  found?: Parameters<typeof buildEnrolmentClass>[0];
  noClass?: boolean;
  enrolments?: ReturnType<typeof buildEnrolment>[];
  studentName?: string | null;
  waitingListEnabled?: boolean;
  seatsTaken?: number;
}

function setup(options: Options = {}) {
  const enrolments = new FakeEnrolmentRepository(options.enrolments);
  const classes = new FakeEnrolmentClassReader(
    options.noClass ? [] : [buildEnrolmentClass(options.found)],
  );
  const names = new FakeStudentNameReader(
    options.studentName === null ? {} : { [STUDENT.id]: options.studentName ?? "Ana Souza" },
  );
  const notifier = new FakeEnrolmentNotifier();
  const useCase = new RequestSeat(
    enrolments,
    classes,
    names,
    notifier,
    new FakeClockProvider(options.now ?? NOW),
    new FakeWaitingListSetting(options.waitingListEnabled),
    { countSeatsTaken: async () => options.seatsTaken ?? 0 } satisfies SeatCounter,
  );

  return { useCase, enrolments, notifier, input: { actor: STUDENT, classId: CLASS_ID, acceptCancellationRule: true } };
}

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (error) => error,
  );
}

describe("RequestSeat", () => {
  it("stores a pending enrolment with the rule acceptance time", async () => {
    const { useCase, input, enrolments } = setup();

    const out = await useCase.execute(input);

    expect(out).toEqual({ id: expect.any(String), classId: CLASS_ID, status: "pending", requestedAt: NOW });
    const [stored] = enrolments.all;
    expect(stored.id).toBe(out.id);
    expect(stored.studentId).toBe(STUDENT.id);
    expect(stored.ruleAcceptedAt).toEqual(NOW);
  });

  it("accepts a full class the same way", async () => {
    const { useCase, input } = setup({ found: { capacity: 1 }, seatsTaken: 1 });

    expect((await useCase.execute(input)).status).toBe("pending");
  });

  it.each([[undefined], [true], [false]])(
    "stores no acceptance when the discipline has no rule (flag %j)",
    async (acceptCancellationRule) => {
      const { useCase, input, enrolments } = setup({ found: { hasCancellationRule: false } });

      await useCase.execute({ ...input, acceptCancellationRule });

      expect(enrolments.all[0].ruleAcceptedAt).toBeNull();
    },
  );

  describe("waiting list", () => {
    it("refuses a full class while the waiting list is off, storing nothing", async () => {
      const { useCase, input, enrolments, notifier } = setup({
        found: { capacity: 2 },
        seatsTaken: 2,
        waitingListEnabled: false,
      });

      expect(await errorOf(useCase.execute(input))).toMatchObject({
        message: "enrolment.waitingList.closed",
        statusCode: 409,
      });
      expect(enrolments.all).toEqual([]);
      expect(notifier.requestedEvents).toEqual([]);
    });

    it("refuses a class over its capacity the same way", async () => {
      const { useCase, input } = setup({ found: { capacity: 2 }, seatsTaken: 3, waitingListEnabled: false });

      expect(await errorOf(useCase.execute(input))).toMatchObject({ message: "enrolment.waitingList.closed" });
    });

    it("accepts a class with a free seat while the waiting list is off", async () => {
      const { useCase, input } = setup({ found: { capacity: 2 }, seatsTaken: 1, waitingListEnabled: false });

      expect((await useCase.execute(input)).status).toBe("pending");
    });

    it("accepts a full class while the waiting list is on", async () => {
      const { useCase, input } = setup({ found: { capacity: 2 }, seatsTaken: 2, waitingListEnabled: true });

      expect((await useCase.execute(input)).status).toBe("pending");
    });

    it("checks it after the class started and before the cancellation rule", async () => {
      const full = { found: { capacity: 1 }, seatsTaken: 1, waitingListEnabled: false };
      const started = setup({ ...full, now: TOMORROW });
      const notAccepted = setup(full);

      expect(await errorOf(started.useCase.execute(started.input))).toMatchObject({ message: "class.started" });
      expect(
        await errorOf(notAccepted.useCase.execute({ ...notAccepted.input, acceptCancellationRule: false })),
      ).toMatchObject({ message: "enrolment.waitingList.closed" });
    });
  });

  it("refuses an account that isn't approved", async () => {
    const { useCase, input, enrolments } = setup();

    expect(await errorOf(useCase.execute({ ...input, actor: { ...STUDENT, status: "pending" } }))).toEqual(
      new ForbiddenError("user.status.notApproved"),
    );
    expect(enrolments.all).toEqual([]);
  });

  it.each([[INSTRUCTOR], [ADMIN]])("refuses a %j", async (actor) => {
    const { useCase, input, enrolments, notifier } = setup();

    expect(await errorOf(useCase.execute({ ...input, actor }))).toEqual(
      new ForbiddenError("enrolment.role.notStudent"),
    );
    expect(enrolments.all).toEqual([]);
    expect(notifier.requestedEvents).toEqual([]);
  });

  it.each([["not-a-uuid"], [123], ["11111111-1111-4111-8111-111111111111"]])(
    "answers class.notFound for %j",
    async (classId) => {
      const { useCase, input } = setup();

      expect(await errorOf(useCase.execute({ ...input, classId: classId as string }))).toEqual(
        new NotFoundError("class.notFound"),
      );
    },
  );

  it("refuses a cancelled class", async () => {
    const { useCase, input } = setup({ found: { cancelledAt: NOW } });

    expect(await errorOf(useCase.execute(input))).toMatchObject({ message: "class.cancelled", statusCode: 409 });
  });

  it.each([
    ["at its start instant", TOMORROW],
    ["after it finished", new Date(TOMORROW.getTime() + 2 * 60 * 60 * 1000)],
  ])("refuses a class that started, %s", async (_name, now) => {
    const { useCase, input, enrolments } = setup({ now });

    expect(await errorOf(useCase.execute(input))).toMatchObject({ message: "class.started", statusCode: 409 });
    expect(enrolments.all).toEqual([]);
  });

  it("accepts a request one millisecond before the start", async () => {
    const { useCase, input } = setup({ now: new Date(TOMORROW.getTime() - 1) });

    expect((await useCase.execute(input)).status).toBe("pending");
  });

  it.each([[undefined], [false], ["true"], [1]])(
    "refuses the rule not accepted (%j) and stores nothing",
    async (acceptCancellationRule) => {
      const { useCase, input, enrolments, notifier } = setup();

      expect(await errorOf(useCase.execute({ ...input, acceptCancellationRule }))).toMatchObject({
        message: "enrolment.rule.notAccepted",
        statusCode: 422,
      });
      expect(enrolments.all).toEqual([]);
      expect(notifier.requestedEvents).toEqual([]);
    },
  );

  it("refuses a second open request, pending or approved", async () => {
    for (const status of ["pending", "approved"] as const) {
      const { useCase, input, notifier } = setup({ enrolments: [buildEnrolment({ status })] });

      expect(await errorOf(useCase.execute(input))).toEqual(new ConflictError("enrolment.alreadyOpen"));
      expect(notifier.requestedEvents).toEqual([]);
    }
  });

  it("requests again after an earlier request ended, keeping the earlier one", async () => {
    const earlier = buildEnrolment({ status: "withdrawn" });
    const { useCase, input, enrolments } = setup({ enrolments: [earlier] });

    const out = await useCase.execute(input);

    expect(out.status).toBe("pending");
    expect(out.id).not.toBe(earlier.id);
    expect(enrolments.all.map((item) => item.status)).toEqual(["withdrawn", "pending"]);
  });

  it("leaves one pending enrolment when the repository loses a race", async () => {
    const { useCase, input, enrolments } = setup();
    enrolments.createError = new ConflictError("enrolment.alreadyOpen");

    expect(await errorOf(useCase.execute(input))).toEqual(new ConflictError("enrolment.alreadyOpen"));
  });

  describe("notification", () => {
    it("tells the class's people with the student's name", async () => {
      const { useCase, input, notifier } = setup();

      await useCase.execute(input);

      expect(notifier.requestedEvents).toEqual([
        {
          classId: CLASS_ID,
          studentName: "Ana Souza",
          discipline: "surf",
          startsAt: TOMORROW,
          instructorIds: [INSTRUCTOR.id],
        },
      ]);
    });

    it("answers 201 when the notifier fails", async () => {
      const { useCase, input, notifier, enrolments } = setup();
      notifier.error = new Error("push down");

      expect((await useCase.execute(input)).status).toBe("pending");
      expect(enrolments.all).toHaveLength(1);
    });

    it("tells nobody when the student has no name on file", async () => {
      const { useCase, input, notifier } = setup({ studentName: null });

      expect((await useCase.execute(input)).status).toBe("pending");
      expect(notifier.requestedEvents).toEqual([]);
    });
  });
});
